use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};
use anchor_lang::system_program;

declare_id!("3mAzfMT32KMzGQe1qibqvjRZnpWHoF7yX2GPLqHJtDx5");

#[program]
pub mod cash_dapp {

    use super::*;

    // 初始化账户的指令
    // pub关键字表示这是一个公开的函数，可以从外部调用
    // Context<T>是Anchor框架中的类型，包含了指令的上下文信息
    // -> Result<()>表示函数返回一个Result类型，成功时为()（空元组），失败时为错误
    pub fn initialize_account(ctx: Context<InitializeAccount>) -> Result<()> {
        // 从上下文中获取cash_account账户的可变引用
        // &mut表示可变引用，这是Rust的所有权系统的一部分
        let cash_account = &mut ctx.accounts.cash_account;
        // 设置账户的所有者为签名者的公钥
        // *操作符用于解引用，获取实际的值
        cash_account.owner = *ctx.accounts.signer.key;
        // 初始化一个空的朋友列表
        // Vec::new()创建一个新的空向量，这是Rust标准库中的集合类型
        cash_account.friends = Vec::new();
        // 创建一个计数器变量并初始化为0
        // u64是Rust中的无符号64位整数类型
        let count: u64 = 0;
        // 设置待处理请求计数器的初始值
        cash_account.pending_request_counter = count;
        // 返回成功结果
        // Ok(())是Result枚举的成功变体，包含空元组值
        Ok(())
    }

    pub fn deposit_funds(ctx: Context<DepositFunds>, amount: u64) -> Result<()> {
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.signer.key,
            ctx.accounts.cash_account.to_account_info().key,
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.cash_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let cash_account = &mut ctx.accounts.cash_account.to_account_info();
        
        let wallet = &mut ctx.accounts.signer.to_account_info();

        **cash_account.try_borrow_mut_lamports()? -= amount;
        **wallet.try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}


#[derive(Accounts)]
pub struct WithdrawFunds<'info> {

    #[account(
        mut,
        seeds = [b"cash-account", signer.key().as_ref()],
        bump
    )]
    pub cash_account: Account<'info, CashAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositFunds<'info> {
    #[account(
        mut,
        seeds = [b"cash-account", signer.key().as_ref()],
        bump,
    )]
    pub cash_account: Account<'info, CashAccount>,
    #[account(mut, signer)] // 确保签名验证
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeAccount<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + CashAccount::INIT_SPACE,
        seeds = [b"cash-account", signer.key().as_ref()],
        bump
    )]
    pub cash_account: Account<'info, CashAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct CashAccount {
    pub owner: Pubkey,
    #[max_len(100)]
    pub friends: Vec<Pubkey>,

    pub pending_request_counter: u64,
}

// 定义错误代码枚举
// #[error_code]宏是Anchor特有的，用于定义程序的错误代码
#[error_code]
pub enum ErrorCode {
    // 无效金额错误
    // #[msg("...")]属性定义了错误的描述信息
    #[msg("The provided amount must be greater than zero.")]
    InvalidAmount,

    // 资金不足错误
    #[msg("Insufficient funds to perform the transfer.")]
    InsufficientFunds,

    // 无效签名者错误
    #[msg("Signer does not have access to call this instruction.")]
    InvalidSigner,
    
    // 转账失败错误
    #[msg("Transfer operation failed to complete successfully.")]
    TransferFailed,
}
