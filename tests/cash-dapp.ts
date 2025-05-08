import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CashDapp } from "../target/types/cash_dapp";

import { Keypair, LAMPORTS_PER_SOL, PublicKey, AccountMeta } from "@solana/web3.js";

describe("cash-dapp", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CashDapp as Program<CashDapp>;
  let user: Keypair;
  let cashAccountPda: PublicKey;
  let bump: number;

  before(async () => {
    // 创建测试用户并获取空投
    user = Keypair.generate();
    console.log("User Public Key: ", user.publicKey.toString());
    [cashAccountPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("cash-account"), user.publicKey.toBuffer()],
      program.programId
    );

    console.log("Cash Account PDA: ", cashAccountPda.toString());
    console.log("Bump: ", bump);

    // 为空投用户获取一些测试 SOL
    const airdropSignature = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature, "confirmed");
    console.log("Airdrop Signature: ", airdropSignature);
  });

  it("Is initialized!", async () => {
    console.log("Initializing Account...");
    // 初始化账户
    const tx = await program.methods
      .initializeAccount()
      .accounts({
        cashAccount: cashAccountPda,
        signer: user.publicKey, // 使用公钥，自动包装为 AccountInfo
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    console.log("Transaction Signature: ", tx);

    // 获取账户数据
    const cashAccountData = await program.account.cashAccount.fetch(cashAccountPda);
    console.log("Cash Account Data: ", cashAccountData);
  });

  it("deposit funds", async () => {
    console.log("Deposit funds...");
    // 存款
    try {
      const tx = await program.methods
        .depositFunds(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          cashAccount: cashAccountPda,
          signer: user.publicKey, // 使用公钥，自动包装为 AccountInfo
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc(
          { skipPreflight: true }
        );
      console.log("Deposit funds Signature: ", tx);
    } catch (error) {
      console.error("Error during deposit: ", error);
    }
    // 验证余额增加
    const accountInfo = await provider.connection.getAccountInfo(cashAccountPda);
    console.log("Account Info: ", accountInfo);
  });
});
