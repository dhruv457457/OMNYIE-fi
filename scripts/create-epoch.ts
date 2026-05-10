import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const STRATA_CORE_ID = new PublicKey(
  "3mp3PQySrr9kTWT2SbNSiz57VrSenxAnvTygCkzTY6yJ",
);
const USDC_MINT = new PublicKey("8a6jsDxNAm51EL1DBZbVwt96VLKnVZWd8ama6TDsMoEk");

const coreIdl = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "target", "idl", "strata_core.json"),
    "utf-8",
  ),
);

function loadKeypair(): Keypair {
  const keypairPath =
    process.env.ANCHOR_WALLET ||
    process.env.KEYPAIR_PATH ||
    path.join(os.homedir(), ".config", "solana", "id.json");
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function parseDuration(value = "sevenDays") {
  switch (value) {
    case "7":
    case "7d":
    case "sevenDays":
      return { sevenDays: {} };
    case "14":
    case "14d":
    case "fourteenDays":
      return { fourteenDays: {} };
    case "30":
    case "30d":
    case "thirtyDays":
      return { thirtyDays: {} };
    default:
      throw new Error("Duration must be one of: 7, 14, 30");
  }
}

async function main() {
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  const authority = loadKeypair();
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const duration = parseDuration(process.argv[2]);
  const seniorRateBps = Number(process.argv[3] ?? 800);
  const seniorCap = new BN(Number(process.argv[4] ?? 500_000) * 1e6);
  const juniorCap = new BN(Number(process.argv[5] ?? 300_000) * 1e6);

  const program = new Program(coreIdl as any, provider);
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    STRATA_CORE_ID,
  );
  const protocol = await (program.account as any).protocol.fetch(protocolPDA);
  const epochNumber = protocol.epochCount as BN;
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

  console.log("Creating epoch", epochNumber.toNumber());
  console.log("Authority:", authority.publicKey.toBase58());
  console.log("Protocol PDA:", protocolPDA.toBase58());
  console.log("Epoch PDA:", epochPDA.toBase58());
  console.log("Epoch vault:", epochVault.toBase58());
  console.log("Senior APY bps:", seniorRateBps);

  const sig = await (program.methods as any)
    .createEpoch(duration, seniorRateBps, seniorCap, juniorCap)
    .accounts({
      authority: authority.publicKey,
      protocol: protocolPDA,
      epoch: epochPDA,
      epochVault,
      usdcMint: USDC_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Created epoch tx:", sig);
  console.log("New epoch number:", epochNumber.toNumber());
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
