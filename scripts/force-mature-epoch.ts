import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const STRATA_CORE_ID = new PublicKey(
  "Gu9BtKAQ7dHZhig9Z3aESR9hR7xcWTjjGeAN6bHZCBvX"
);

const coreIdl = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "target", "idl", "strata_core.json"),
    "utf-8"
  )
);

function loadKeypair(): Keypair {
  const keypairPath =
    process.env.ANCHOR_WALLET ||
    process.env.KEYPAIR_PATH ||
    path.join(os.homedir(), ".config", "solana", "id.json");
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
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

  const program = new Program(coreIdl as any, provider);
  const [protocolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    STRATA_CORE_ID
  );

  const protocol = await (program.account as any).protocol.fetch(protocolPDA);
  const latestEpoch = (protocol.epochCount as BN).toNumber() - 1;
  const epochNumber = Number(process.argv[2] ?? latestEpoch);
  const additionalYieldUsdc = Number(process.argv[3] ?? 0);
  const additionalYield = new BN(Math.round(additionalYieldUsdc * 1e6));

  if (!Number.isInteger(epochNumber) || epochNumber < 0) {
    throw new Error("Usage: npx tsx scripts/force-mature-epoch.ts <epoch> [additional_yield_usdc]");
  }

  const [epochPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("epoch"),
      protocolPDA.toBuffer(),
      new BN(epochNumber).toArrayLike(Buffer, "le", 8),
    ],
    STRATA_CORE_ID
  );

  console.log("Force maturing epoch", epochNumber);
  console.log("Authority:", authority.publicKey.toBase58());
  console.log("Epoch PDA:", epochPDA.toBase58());
  console.log("Additional mock yield:", additionalYieldUsdc, "USDC");

  const sig = await (program.methods as any)
    .forceMatureEpoch(additionalYield)
    .accounts({
      authority: authority.publicKey,
      protocol: protocolPDA,
      epoch: epochPDA,
    })
    .rpc();

  console.log("Force mature tx:", sig);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
