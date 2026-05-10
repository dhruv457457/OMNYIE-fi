import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
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

  const epochNumber = Number(process.argv[2] ?? 3);
  const trancheType = process.argv[3] ?? "senior";
  const trancheByte = trancheType === "senior" ? 0 : 1;

  const [epochPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("epoch"),
      protocolPDA.toBuffer(),
      new BN(epochNumber).toArrayLike(Buffer, "le", 8),
    ],
    STRATA_CORE_ID,
  );

  const [positionPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("position"),
      epochPDA.toBuffer(),
      authority.publicKey.toBuffer(),
      Buffer.from([trancheByte]),
    ],
    STRATA_CORE_ID,
  );

  const [epochVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("epoch_vault"), epochPDA.toBuffer()],
    STRATA_CORE_ID,
  );

  const userUSDC = await anchor.utils.token.associatedAddress(
    authority.publicKey,
    USDC_MINT,
  );

  console.log("Withdrawing from epoch", epochNumber, trancheType);
  console.log("Authority:", authority.publicKey.toBase58());
  console.log("Protocol PDA:", protocolPDA.toBase58());
  console.log("Epoch PDA:", epochPDA.toBase58());
  console.log("Position PDA:", positionPDA.toBase58());
  console.log("Epoch Vault:", epochVault.toBase58());
  console.log("User USDC:", userUSDC.toBase58());

  try {
    const sig = await (program.methods as any)
      .withdraw()
      .accounts({
        user: authority.publicKey,
        protocol: protocolPDA,
        epoch: epochPDA,
        position: positionPDA,
        owner: authority.publicKey,
        userUsdc: userUSDC,
        epochVault: epochVault,
        usdcMint: USDC_MINT,
        tokenProgram: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        ),
      })
      .rpc();

    console.log("Withdraw tx:", sig);
    console.log("SUCCESS!");
  } catch (err) {
    console.error("Withdraw error:", err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
