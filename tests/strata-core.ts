import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

// Import IDL types (generated after anchor build)
// import { StrataCore } from "../target/types/strata_core";
// import { StrataToken } from "../target/types/strata_token";

describe("strata-finance", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // These will be loaded after `anchor build` generates the IDL
  // const coreProgram = anchor.workspace.StrataCore as Program<StrataCore>;
  // const tokenProgram = anchor.workspace.StrataToken as Program<StrataToken>;

  const authority = provider.wallet as anchor.Wallet;
  let usdcMint: PublicKey;
  let userUsdcAccount: PublicKey;
  let protocolPda: PublicKey;
  let protocolBump: number;
  let vaultPda: PublicKey;
  let epochPda: PublicKey;

  const USDC_DECIMALS = 6;
  const DEPOSIT_AMOUNT = 1_000 * 10 ** USDC_DECIMALS; // 1000 USDC
  const PERFORMANCE_FEE = 500; // 5%
  const EARLY_WITHDRAWAL_FEE = 100; // 1%
  const INSURANCE_FEE = 50; // 0.5%

  before(async () => {
    // Create mock USDC mint
    const mintKeypair = Keypair.generate();
    usdcMint = await createMint(
      provider.connection,
      (authority as any).payer,
      authority.publicKey,
      null,
      USDC_DECIMALS,
      mintKeypair
    );

    // Create user USDC account and mint test tokens
    userUsdcAccount = await createAccount(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      authority.publicKey
    );

    await mintTo(
      provider.connection,
      (authority as any).payer,
      usdcMint,
      userUsdcAccount,
      authority.publicKey,
      100_000 * 10 ** USDC_DECIMALS // 100k USDC
    );

    // Derive PDAs
    [protocolPda, protocolBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      new PublicKey("STRATxN3hR5gMmfK2mHF4pkP8Kz1GqfAzPxvEBKpump")
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from("protocol")],
      new PublicKey("STRATxN3hR5gMmfK2mHF4pkP8Kz1GqfAzPxvEBKpump")
    );

    console.log("Setup complete:");
    console.log("  USDC Mint:", usdcMint.toBase58());
    console.log("  Protocol PDA:", protocolPda.toBase58());
    console.log("  User USDC:", userUsdcAccount.toBase58());
  });

  describe("Initialize Protocol", () => {
    it("should initialize the protocol", async () => {
      // After anchor build, uncomment:
      // const tx = await coreProgram.methods
      //   .initialize(
      //     srMint,
      //     jrMint,
      //     tokenProgramId,
      //     PERFORMANCE_FEE,
      //     EARLY_WITHDRAWAL_FEE,
      //     INSURANCE_FEE
      //   )
      //   .accounts({
      //     authority: authority.publicKey,
      //     protocol: protocolPda,
      //     usdcMint: usdcMint,
      //     vault: vaultPda,
      //     treasury: authority.publicKey,
      //     tokenProgram: TOKEN_2022_PROGRAM_ID,
      //     systemProgram: SystemProgram.programId,
      //   })
      //   .rpc();
      //
      // const protocol = await coreProgram.account.protocol.fetch(protocolPda);
      // assert.equal(protocol.performanceFeeBps, PERFORMANCE_FEE);
      // assert.equal(protocol.earlyWithdrawalFeeBps, EARLY_WITHDRAWAL_FEE);
      // assert.equal(protocol.insuranceFeeBps, INSURANCE_FEE);
      // assert.equal(protocol.paused, false);
      // assert.equal(protocol.epochCount.toNumber(), 0);

      console.log("  [placeholder] Initialize test - will work after anchor build");
    });
  });

  describe("Create Epoch", () => {
    it("should create a 7-day epoch", async () => {
      // After anchor build, uncomment:
      // const epochNumber = 0;
      // [epochPda] = PublicKey.findProgramAddressSync(
      //   [
      //     Buffer.from("epoch"),
      //     protocolPda.toBuffer(),
      //     new anchor.BN(epochNumber).toArrayLike(Buffer, "le", 8),
      //   ],
      //   coreProgram.programId
      // );
      //
      // const tx = await coreProgram.methods
      //   .createEpoch(
      //     { sevenDays: {} },  // EpochDuration enum
      //     800,                // 8% senior fixed rate
      //     new anchor.BN(500_000 * 10 ** USDC_DECIMALS), // 500k cap
      //     new anchor.BN(500_000 * 10 ** USDC_DECIMALS), // 500k cap
      //   )
      //   .accounts({
      //     authority: authority.publicKey,
      //     protocol: protocolPda,
      //     epoch: epochPda,
      //     epochVault: epochVaultPda,
      //     usdcMint: usdcMint,
      //     tokenProgram: TOKEN_2022_PROGRAM_ID,
      //     systemProgram: SystemProgram.programId,
      //   })
      //   .rpc();
      //
      // const epoch = await coreProgram.account.epoch.fetch(epochPda);
      // assert.deepEqual(epoch.status, { open: {} });
      // assert.equal(epoch.seniorFixedRateBps, 800);

      console.log("  [placeholder] Create epoch test - will work after anchor build");
    });
  });

  describe("Deposit", () => {
    it("should deposit into senior tranche", async () => {
      console.log("  [placeholder] Senior deposit test");
    });

    it("should deposit into junior tranche", async () => {
      console.log("  [placeholder] Junior deposit test");
    });

    it("should reject deposit when epoch is not open", async () => {
      console.log("  [placeholder] Reject deposit test");
    });

    it("should reject deposit exceeding cap", async () => {
      console.log("  [placeholder] Cap exceeded test");
    });
  });

  describe("Epoch Lifecycle", () => {
    it("should start epoch after deposits", async () => {
      console.log("  [placeholder] Start epoch test");
    });

    it("should harvest yield", async () => {
      console.log("  [placeholder] Harvest yield test");
    });

    it("should distribute yield after maturity", async () => {
      console.log("  [placeholder] Distribute yield test");
    });
  });

  describe("Withdraw", () => {
    it("should withdraw principal + yield after maturity", async () => {
      console.log("  [placeholder] Withdraw test");
    });

    it("should apply early withdrawal fee", async () => {
      console.log("  [placeholder] Early withdrawal fee test");
    });
  });

  describe("Yield Math", () => {
    it("should calculate senior yield correctly", () => {
      // 8% APY on 100,000 USDC for 7 days
      // yield = 100000 * 800 * (7*86400) / (10000 * 365*86400)
      // yield = 100000 * 800 * 604800 / (10000 * 31536000)
      // yield ≈ 153.42 USDC
      const principal = 100_000_000_000; // 100k USDC in lamports
      const rateBps = 800;
      const durationSeconds = 7 * 24 * 60 * 60;
      const yearSeconds = 365 * 24 * 60 * 60;

      const yieldAmount = Math.floor(
        (principal * rateBps * durationSeconds) / (10000 * yearSeconds)
      );

      assert.approximately(yieldAmount / 10 ** USDC_DECIMALS, 153.42, 1);
      console.log(`  Senior yield on 100k USDC @ 8% for 7d: ${yieldAmount / 10 ** USDC_DECIMALS} USDC`);
    });

    it("should calculate junior yield in normal scenario", () => {
      // Total yield: 10% APY on 200k (100k senior + 100k junior) for 7 days
      // total_yield = 200000 * 1000 * 604800 / (10000 * 31536000) ≈ 383.56
      // senior gets fixed 8%: ≈ 153.42
      // remaining: 383.56 - 153.42 = 230.14
      // 5% performance fee on remaining: 11.51
      // 0.5% insurance: 1.15
      // junior gets: 230.14 - 11.51 - 1.15 = 217.48
      // junior effective APY ≈ 11.3%

      const totalDeposits = 200_000_000_000;
      const totalYieldBps = 1000; // 10% from underlying
      const durationSeconds = 7 * 24 * 60 * 60;
      const yearSeconds = 365 * 24 * 60 * 60;

      const totalYield = Math.floor(
        (totalDeposits * totalYieldBps * durationSeconds) / (10000 * yearSeconds)
      );
      const seniorYield = Math.floor(
        (100_000_000_000 * 800 * durationSeconds) / (10000 * yearSeconds)
      );
      const remaining = totalYield - seniorYield;
      const perfFee = Math.floor(remaining * 500 / 10000);
      const insFee = Math.floor(remaining * 50 / 10000);
      const juniorYield = remaining - perfFee - insFee;

      console.log(`  Total yield: ${totalYield / 10 ** USDC_DECIMALS} USDC`);
      console.log(`  Senior yield: ${seniorYield / 10 ** USDC_DECIMALS} USDC`);
      console.log(`  Junior yield: ${juniorYield / 10 ** USDC_DECIMALS} USDC`);
      console.log(`  Fees: ${(perfFee + insFee) / 10 ** USDC_DECIMALS} USDC`);

      // Junior gets more than senior (leveraged return)
      assert.isAbove(juniorYield, seniorYield);
    });
  });
});
