import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CashDapp } from "../target/types/cash_dapp";

import { Keypair, LAMPORTS_PER_SOL, PublicKey, AccountMeta } from "@solana/web3.js";

describe("cash-dapp", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CashDapp as Program<CashDapp>;
  let user1, user2: Keypair;
  let user1Pda, user2Pda: PublicKey;
  let bump: number;


  before(async () => {
    // 创建测试用户并获取空投
    user1 = Keypair.generate();
    console.log("User Public Key: ", user1.publicKey.toString());
    [user1Pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("cash-account"), user1.publicKey.toBuffer()],
      program.programId
    );
    console.log("Cash Account PDA: ", user1Pda.toString());
    console.log("Bump: ", bump);

    user2 = Keypair.generate();
    [user2Pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("cash-account"), user2.publicKey.toBuffer()],
      program.programId
    );


    // 为空投用户获取一些测试 SOL
    const user1Airdrop = await provider.connection.requestAirdrop(
      user1.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(user1Airdrop, "confirmed");
    console.log("Airdrop Signature: ", user1Airdrop);
    // 为空投用户获取一些测试 SOL
    const user2Airdrop = await provider.connection.requestAirdrop(
      user2.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(user2Airdrop, "confirmed");
    console.log("Airdrop Signature: ", user2Airdrop);
  });

  it("Is initialized!", async () => {
    console.log("Initializing Account...");
    // 初始化账户
    const tx1 = await program.methods
      .initializeAccount()
      .accounts({
        signer: user1.publicKey, // 使用公钥，自动包装为 AccountInfo
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user1])
      .rpc();
    console.log("user1 Transaction Signature: ", tx1);
    // 初始化账户
    const tx2 = await program.methods
      .initializeAccount()
      .accounts({
        signer: user2.publicKey, // 使用公钥，自动包装为 AccountInfo
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user2])
      .rpc();
    console.log("user2 Transaction Signature: ", tx2);

    // 获取账户数据
    const user1Data = await program.account.cashAccount.fetch(user1Pda);
    console.log("Cash Account Data: ", user1Data);

    const user2Data = await program.account.cashAccount.fetch(user2Pda);
    console.log("Cash Account Data: ", user2Data);
  });

  it("deposit funds", async () => {
    console.log("Deposit funds...");
    // 存款
    const tx = await program.methods
      .depositFunds(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        signer: user1.publicKey, // 使用公钥，自动包装为 AccountInfo
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user1])
      .rpc({ skipPreflight: true });

    console.log("Deposit funds Signature: ", tx);
    // 验证余额增加
    const accountInfo = await provider.connection.getAccountInfo(user1Pda);
    console.log("Account Info: ", accountInfo);
    // console.log("Balance: ", accountInfo.lamports);
  });

  it("withdraw funds", async () => {
    console.log("WithdrawFunds ...")

    const tx = await program.methods.withdrawFunds(new anchor.BN(LAMPORTS_PER_SOL * 0.5))
      .accounts({
        signer: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([user1]).rpc({ skipPreflight: true });

    console.log("Withdraw funds Signature: ", tx);
  });

  it("transfer funds", async () => {
    console.log("transfer funds ...");


    console.log("new account pda is: ", user2Pda.toString());

    const tx = await program.methods.transferFunds(
      user2.publicKey,
      new anchor.BN(LAMPORTS_PER_SOL * 0.5)
    ).accounts({
      signer: user1.publicKey,
      system_program: anchor.web3.SystemProgram.programId
    }).signers([user1]).rpc();
    console.log("Transfer funds Signature: ", tx);


    const withdrawTx = await program.methods.withdrawFunds(
      new anchor.BN(LAMPORTS_PER_SOL * 0.5)
    ).accounts({
      signer: user2.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([user2]).rpc();

    console.log("Withdraw funds Signature: ", withdrawTx);
  })

  it("add friends", async () => {

    console.log("add friends ...");

    const tx = await program.methods.addFriend(user2.publicKey).accounts(
      {
        signer: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    ).signers([user1]).rpc();
    console.log("Add friends Signature: ", tx);

    const user1Data = await program.account.cashAccount.fetch(user1Pda);
    console.log("user1 friends: ", user1Data.friends);
  })

  let pending_request_pda: PublicKey;
  it("add pending request", async () => {
    console.log("add pending request ...");

    [pending_request_pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("pending-request"), user1.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods.newPendingRequest(
      user1.publicKey, new anchor.BN(0.01 * LAMPORTS_PER_SOL)
    ).accounts(
      {
        signer: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    ).signers([user1]).rpc();

    console.log("Add pending request Signature: ", tx);


    const pendingRequest = await program.account.pendingRequest.fetch(pending_request_pda);
    console.log("Pending Request: ", pendingRequest);
  })

  it("accept pending request", async () => {
    console.log("accept pending request ....");

    const tx = await program.methods.acceptRequest().accounts({
      pendingRequest: pending_request_pda,
      signer: user1.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([user1]).rpc({ skipPreflight: true });
    console.log("Accept pending request Signature: ", tx);

  })

});
