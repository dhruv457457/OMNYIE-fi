import { PublicKey } from "@solana/web3.js";

export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || "devnet") as
  | "devnet"
  | "mainnet-beta";

const heliusKey = process.env.NEXT_PUBLIC_HELIUS_KEY;

export const RPC_URL = heliusKey
  ? NETWORK === "mainnet-beta"
    ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
    : `https://devnet.helius-rpc.com/?api-key=${heliusKey}`
  : process.env.NEXT_PUBLIC_RPC_URL ||
    (NETWORK === "mainnet-beta"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com");

export const STRATA_CORE_PROGRAM_ID = new PublicKey(
  "Gu9BtKAQ7dHZhig9Z3aESR9hR7xcWTjjGeAN6bHZCBvX"
);

export const STRATA_TOKEN_PROGRAM_ID = new PublicKey(
  "BHEacctLwvbEs8NSDEUC8AGPDCK3VvTrXL6snkvV3uzn"
);

export const ENCRYPT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ENCRYPT_PROGRAM_ID ||
    "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8"
);

export const ENCRYPT_NETWORK_KEY = Buffer.alloc(32, 0x55);

export const USDC_MINT =
  NETWORK === "mainnet-beta"
    ? new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    : new PublicKey("8a6jsDxNAm51EL1DBZbVwt96VLKnVZWd8ama6TDsMoEk"); // our devnet test USDC

export const USDC_DECIMALS = 6;

export const EPOCH_DURATIONS = [
  { label: "7 Days", value: "sevenDays", seconds: 7 * 86400 },
  { label: "14 Days", value: "fourteenDays", seconds: 14 * 86400 },
  { label: "30 Days", value: "thirtyDays", seconds: 30 * 86400 },
] as const;
