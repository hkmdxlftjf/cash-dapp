import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CashDapp } from "../target/types/cash_dapp";

import { Keypair } from "@solana/web3.js";

describe("cash-dapp", () => {
  // Configure the client to use the local cluster.


  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CashDapp as Program<CashDapp>;
  let user;
  let cashAccountPda;
  before(async () => {
    user = Keypair.generate();
    console.log("User Public Key: ", user.publicKey.toString());
    cashAccountPda = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('cash-account'), user.publicKey.toBuffer()],
      program.programId
    );

    console.log("Cash Account PDA: ", cashAccountPda.toString())

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 1000000000),
      "confirmed"
    )
  });

  it("Is initialized!", async () => {
    const tx = await program.methods.initializeAccount().accounts(
      {
        cashAccount: cashAccountPda,
        signer: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([user]).rpc({
        skipPreflight: true,
      })
    console.log("Transaction Signature: ", tx);
    const cashAccountData = await program.account.cashAccount.fetch(cashAccountPda);
    console.log("Cash Account Data: ", cashAccountData);
  })
});
