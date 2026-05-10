/**
 * OMNYIE Finance - Protocol Initialization Script
 *
 * This script:
 * 1. Creates a USDC mint on devnet (for testing)
 * 2. Initializes strata_token (creates srUSDC + jrUSDC mints via Token-2022)
 * 3. Initializes strata_core protocol
 * 4. Creates 3 sample epochs (7d, 14d, 30d)
 *
 * Run: npx ts-node --esm scripts/initialize-protocol.ts
 * Or:  npx tsx scripts/initialize-protocol.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Program IDs (from Anchor.toml)
const STRATA_CORE_ID = new PublicKey(
  "3mp3PQySrr9kTWT2SbNSiz57VrSenxAnvTygCkzTY6yJ",
);
const STRATA_TOKEN_ID = new PublicKey(
  "BHEacctLwvbEs8NSDEUC8AGPDCK3VvTrXL6snkvV3uzn",
);

// Load IDLs
const coreIdl = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "target", "idl", "strata_core.json"),
    "utf-8",
  ),
);
const tokenIdl = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "target", "idl", "strata_token.json"),
    "utf-8",
  ),
);

// Load wallet keypair
function loadKeypair(): Keypair {
  const keypairPath =
    process.env.ANCHOR_WALLET ||
    process.env.KEYPAIR_PATH ||
    path.join(os.homedir(), ".config", "solana", "id.json");
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  // Setup connection & provider
  // Use public devnet RPC for script (supports WebSocket confirmations)
  // Alchemy free plan doesn't support signatureSubscribe
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const keypair = loadKeypair();
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  console.log("=== OMNYIE Finance Protocol Initialization ===");
  console.log(`Authority: ${keypair.publicKey.toBase58()}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log("");

  // Check balance
  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log("Requesting airdrop...");
    const sig = await connection.requestAirdrop(
      keypair.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(sig, "confirmed");
    console.log("Airdrop received!");
  }

  // Load programs
  const coreProgram = new Program(coreIdl as any, provider);
  const tokenProgram = new Program(tokenIdl as any, provider);

  // ============================
  // Step 1: Create test USDC mint
  // ============================
  console.log("\n--- Step 1: Creating test USDC mint ---");
  const usdcMint = await createMint(
    connection,
    keypair,
    keypair.publicKey, // mint authority
    null, // freeze authority
    6, // decimals
    Keypair.generate(),
    undefined,
    TOKEN_PROGRAM_ID,
  );
  console.log(`USDC Mint: ${usdcMint.toBase58()}`);

  // Mint some test USDC to authority
  const authorityUsdcAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    usdcMint,
    keypair.publicKey,
  );
  await mintTo(
    connection,
    keypair,
    usdcMint,
    authorityUsdcAccount.address,
    keypair,
    100_000 * 1e6, // 100K USDC
  );
  console.log(`Minted 100,000 test USDC to authority`);

  // ============================
  // Step 2: Initialize strata_token (srUSDC + jrUSDC mints)
  // ============================
  console.log("\n--- Step 2: Initializing strata_token ---");

  // PDAs for strata_token
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("tranche_config")],
    STRATA_TOKEN_ID,
  );
  const [srMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("sr_mint")],
    STRATA_TOKEN_ID,
  );
  const [jrMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("jr_mint")],
    STRATA_TOKEN_ID,
  );

  console.log(`Config PDA: ${configPDA.toBase58()}`);
  console.log(`srUSDC Mint PDA: ${srMintPDA.toBase58()}`);
  console.log(`jrUSDC Mint PDA: ${jrMintPDA.toBase58()}`);

  // Check if already initialized
  const configAccount = await connection.getAccountInfo(configPDA);
  if (configAccount) {
    console.log("strata_token already initialized, skipping...");
  } else {
    const tx1 = await (tokenProgram.methods as any)
      .initializeMints(STRATA_CORE_ID)
      .accounts({
        authority: keypair.publicKey,
        config: configPDA,
        srMint: srMintPDA,
        jrMint: jrMintPDA,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`strata_token initialized! TX: ${tx1}`);
  }

  // ============================
  // Step 3: Initialize strata_core protocol
  // ============================
  console.log("\n--- Step 3: Initializing strata_core protocol ---");

  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    STRATA_CORE_ID,
  );
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from("protocol")],
    STRATA_CORE_ID,
  );

  console.log(`Protocol PDA: ${protocolPDA.toBase58()}`);
  console.log(`Vault PDA: ${vaultPDA.toBase58()}`);

  const protocolAccount = await connection.getAccountInfo(protocolPDA);
  if (protocolAccount) {
    console.log("strata_core protocol already initialized, skipping...");
  } else {
    const tx2 = await (coreProgram.methods as any)
      .initialize(
        srMintPDA, // sr_mint
        jrMintPDA, // jr_mint
        STRATA_TOKEN_ID, // token_program_id (strata_token)
        500, // performance_fee_bps (5%)
        100, // early_withdrawal_fee_bps (1%)
        50, // insurance_fee_bps (0.5%)
      )
      .accounts({
        authority: keypair.publicKey,
        protocol: protocolPDA,
        usdcMint: usdcMint,
        vault: vaultPDA,
        treasury: keypair.publicKey, // treasury = authority for now
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`strata_core protocol initialized! TX: ${tx2}`);
  }

  // ============================
  // Step 4: Create sample epochs
  // ============================
  console.log("\n--- Step 4: Creating sample epochs ---");

  const epochConfigs = [
    {
      label: "7-Day Pool",
      duration: { sevenDays: {} },
      seniorRateBps: 800, // 8% APY
      seniorCap: new BN(500_000 * 1e6), // 500K USDC
      juniorCap: new BN(300_000 * 1e6), // 300K USDC
    },
    {
      label: "14-Day Pool",
      duration: { fourteenDays: {} },
      seniorRateBps: 900, // 9% APY
      seniorCap: new BN(750_000 * 1e6),
      juniorCap: new BN(500_000 * 1e6),
    },
    {
      label: "30-Day Pool",
      duration: { thirtyDays: {} },
      seniorRateBps: 1000, // 10% APY
      seniorCap: new BN(1_000_000 * 1e6),
      juniorCap: new BN(750_000 * 1e6),
    },
  ];

  // Get current epoch count
  const protocolData = await (coreProgram.account as any).protocol.fetch(
    protocolPDA,
  );
  let currentEpochCount = (protocolData.epochCount as BN).toNumber();
  console.log(`Current epoch count: ${currentEpochCount}`);

  for (const config of epochConfigs) {
    const epochNumber = new BN(currentEpochCount);
    const [epochPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("epoch"),
        protocolPDA.toBuffer(),
        epochNumber.toArrayLike(Buffer, "le", 8),
      ],
      STRATA_CORE_ID,
    );
    const [epochVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch_vault"), epochPDA.toBuffer()],
      STRATA_CORE_ID,
    );

    // Check if already exists
    const epochAccount = await connection.getAccountInfo(epochPDA);
    if (epochAccount) {
      console.log(`Epoch #${currentEpochCount} already exists, skipping...`);
      currentEpochCount++;
      continue;
    }

    const tx = await (coreProgram.methods as any)
      .createEpoch(
        config.duration,
        config.seniorRateBps,
        config.seniorCap,
        config.juniorCap,
      )
      .accounts({
        authority: keypair.publicKey,
        protocol: protocolPDA,
        epoch: epochPDA,
        epochVault: epochVault,
        usdcMint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(
      `Created Epoch #${currentEpochCount} (${config.label}) - TX: ${tx}`,
    );
    currentEpochCount++;
  }

  // ============================
  // Summary
  // ============================
  console.log("\n=== Initialization Complete! ===");
  console.log(`USDC Mint:        ${usdcMint.toBase58()}`);
  console.log(`srUSDC Mint:      ${srMintPDA.toBase58()}`);
  console.log(`jrUSDC Mint:      ${jrMintPDA.toBase58()}`);
  console.log(`Protocol PDA:     ${protocolPDA.toBase58()}`);
  console.log(`Vault PDA:        ${vaultPDA.toBase58()}`);
  console.log(`Token Config PDA: ${configPDA.toBase58()}`);
  console.log(`Total Epochs:     ${currentEpochCount}`);
  console.log("");
  console.log("Update your app/.env.local with the USDC mint if needed:");
  console.log(`NEXT_PUBLIC_USDC_MINT=${usdcMint.toBase58()}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
