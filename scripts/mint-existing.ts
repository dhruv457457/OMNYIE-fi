import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const connection = new Connection(
  "https://devnet.helius-rpc.com/?api-key=cfaf8792-740e-4149-b248-6f698f7a5c51",
  "confirmed",
);

const keypairPath =
  process.env.KEYPAIR_PATH ||
  path.join(os.homedir(), ".config", "solana", "id.json");
const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const authority = Keypair.fromSecretKey(Uint8Array.from(raw));
const wallet = new Wallet(authority);
const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

const STRATA_TOKEN_ID = new PublicKey(
  "BHEacctLwvbEs8NSDEUC8AGPDCK3VvTrXL6snkvV3uzn",
);
const tokenIdl = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "target", "idl", "strata_token.json"),
    "utf-8",
  ),
);
const program = new Program(tokenIdl as any, provider);

const [configPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("tranche_config")],
  STRATA_TOKEN_ID,
);
const [srMintPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("sr_mint")],
  STRATA_TOKEN_ID,
);

const USER = new PublicKey("FkQpmxT4LUz7rgQJeUNrPfynMJAf9UM1ZwjLRKcttt5Z");
const amount = new BN(100 * 1e6); // 100 srUSDC

async function main() {
  const userAta = getAssociatedTokenAddressSync(
    srMintPDA,
    USER,
    false,
    TOKEN_2022_PROGRAM_ID,
  );
  const ataInfo = await connection.getAccountInfo(userAta);
  const tx = new Transaction();

  if (!ataInfo) {
    console.log("Creating Token-2022 ATA for user...");
    tx.add(
      createAssociatedTokenAccountInstruction(
        authority.publicKey,
        userAta,
        USER,
        srMintPDA,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
  }

  const mintIx = await (program.methods as any)
    .mintTranche({ senior: {} }, amount)
    .accounts({
      caller: authority.publicKey,
      config: configPDA,
      trancheMint: srMintPDA,
      userTrancheAccount: userAta,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .instruction();
  tx.add(mintIx);

  const sig = await sendAndConfirmTransaction(connection, tx, [authority], {
    commitment: "confirmed",
  });
  console.log("Minted 100 srUSDC to", USER.toBase58());
  console.log("TX:", sig);
  console.log("srUSDC Mint:", srMintPDA.toBase58());
  console.log("User ATA:", userAta.toBase58());
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
