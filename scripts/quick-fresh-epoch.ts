import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const STRATA_CORE_ID = new PublicKey(
  "3mp3PQySrr9kTWT2SbNSiz57VrSenxAnvTygCkzTY6yJ",
);

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
    STRATA_CORE_ID,
  );

  const protocol = await (program.account as any).protocol.fetch(protocolPDA);
  const newEpochNum = (protocol.epochCount as BN).toNumber() + 1;

  console.log("Creating fresh epoch", newEpochNum, "for testing...");

  const sign = await (program.methods as any)
    .createEpoch({ sevenDays: {} }, 800, new BN(0), new BN(0))
    .accounts({ authority: authority.publicKey, protocol: protocolPDA })
    .rpc();

  console.log("Created epoch tx:", sign);
  console.log("New epoch number:", newEpochNum);
  console.log("Now force-mature with yield...");

  const [epochPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("epoch"),
      protocolPDA.toBuffer(),
      new BN(newEpochNum).toArrayLike(Buffer, "le", 8),
    ],
    STRATA_CORE_ID,
  );

  const sig2 = await (program.methods as any)
    .forceMatureEpoch(new BN(1_000_000)) // 1 USDC yield
    .accounts({
      authority: authority.publicKey,
      protocol: protocolPDA,
      epoch: epochPDA,
    })
    .rpc();

  console.log("Force mature tx:", sig2);
  console.log("✅ Fresh epoch ready for testing withdraw!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
