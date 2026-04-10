import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import tokenIdl from "@/lib/idl/strata_token.json";

const STRATA_TOKEN_ID = new PublicKey(
  "BHEacctLwvbEs8NSDEUC8AGPDCK3VvTrXL6snkvV3uzn"
);

function getAuthority(): Keypair {
  const raw = JSON.parse(process.env.AUTHORITY_KEYPAIR || "[]");
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function getRpcUrl(): string {
  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_KEY;
  if (heliusKey) {
    return `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
  }
  return "https://api.devnet.solana.com";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userPubkey, trancheType, amount } = body;

    if (!userPubkey || !trancheType || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: userPubkey, trancheType, amount" },
        { status: 400 }
      );
    }

    const authority = getAuthority();
    const connection = new Connection(getRpcUrl(), "confirmed");
    const wallet = new NodeWallet(authority);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    const program = new Program(tokenIdl as any, provider);

    // PDAs
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("tranche_config")],
      STRATA_TOKEN_ID
    );
    const [srMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("sr_mint")],
      STRATA_TOKEN_ID
    );
    const [jrMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("jr_mint")],
      STRATA_TOKEN_ID
    );

    const isSenior = trancheType === "senior";
    const trancheMint = isSenior ? srMintPDA : jrMintPDA;
    const trancheArg = isSenior ? { senior: {} } : { junior: {} };
    const userKey = new PublicKey(userPubkey);

    // Get or create user's Token-2022 ATA for the tranche mint
    const userTrancheAta = getAssociatedTokenAddressSync(
      trancheMint,
      userKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Check if ATA exists, create if not
    const ataInfo = await connection.getAccountInfo(userTrancheAta);
    const tx = new Transaction();

    if (!ataInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey, // payer
          userTrancheAta,
          userKey,
          trancheMint,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    // Build mint instruction
    const mintIx = await (program.methods as any)
      .mintTranche(trancheArg, new BN(amount))
      .accounts({
        caller: authority.publicKey,
        config: configPDA,
        trancheMint: trancheMint,
        userTrancheAccount: userTrancheAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();

    tx.add(mintIx);

    const sig = await sendAndConfirmTransaction(connection, tx, [authority], {
      commitment: "confirmed",
    });

    return NextResponse.json({
      success: true,
      signature: sig,
      trancheMint: trancheMint.toBase58(),
      userTrancheAccount: userTrancheAta.toBase58(),
      tokenType: isSenior ? "srUSDC" : "jrUSDC",
    });
  } catch (error: any) {
    console.error("Mint tranche error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mint tranche tokens" },
      { status: 500 }
    );
  }
}
