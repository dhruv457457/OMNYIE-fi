"use client";

import { useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  AccountMeta,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  useEpochs,
  getEpochDurationLabel,
  getEpochDurationDays,
  getEpochStatusLabel,
} from "@/hooks/useProtocol";
import { STRATA_CORE_PROGRAM_ID, USDC_MINT } from "@/lib/constants";
import {
  deriveEncryptAccounts,
  ENCRYPT_PROGRAM_ID,
} from "@/lib/encrypt";
import idl from "@/lib/idl/strata_core.json";
import { AddTokenBanner } from "@/components/AddTokenBanner";

type DepositMethods = {
  deposit: (
    trancheType: { senior: Record<string, never> } | { junior: Record<string, never> },
    amount: BN,
    encryptCpiAuthorityBump: number,
  ) => {
    accounts: (accounts: Record<string, unknown>) => {
      instruction: () => Promise<TransactionInstruction>;
    };
  };
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const maybeAnchorError = error as {
      error?: { message?: string };
      message?: string;
    };
    return maybeAnchorError.error?.message || maybeAnchorError.message || "Transaction failed";
  }
  return "Transaction failed";
}

function TrancheCard({
  selected,
  onClick,
  apy,
  tvl,
  label,
  desc,
  color,
}: {
  selected: boolean;
  onClick: () => void;
  apy: string;
  tvl: string;
  label: string;
  desc: string;
  color: "blue" | "emerald";
}) {
  const isBlue = color === "blue";
  const accentVar = isBlue ? "blue" : "emerald";

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      animate={selected ? {
        borderColor: [`rgba(59,130,246,0.5)`, `rgba(16,185,129,0.5)`],
      } : {}}
      className={`relative rounded-2xl border-2 p-5 text-left transition-all ${
        selected
          ? `border-${accentVar}-500/50 bg-${accentVar}-500/[0.05]`
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
      style={{
        borderColor: selected
          ? isBlue ? "rgba(59, 130, 246, 0.5)" : "rgba(16, 185, 129, 0.5)"
          : undefined,
        backgroundColor: selected
          ? isBlue ? "rgba(59, 130, 246, 0.05)" : "rgba(16, 185, 129, 0.05)"
          : undefined,
      }}
    >
      {selected && (
        <motion.div
          layoutId="tranche-indicator"
          className={`absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full ${
            isBlue ? "bg-blue-500" : "bg-emerald-500"
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
      <div className="flex items-center justify-between">
        <Badge variant={isBlue ? "info" : "success"}>{label}</Badge>
        <span className={`text-xl font-bold ${isBlue ? "text-blue-400" : "text-emerald-400"}`}>
          {apy}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-white/80">{desc}</p>
      <p className={`mt-3 text-xs ${isBlue ? "text-blue-400/60" : "text-emerald-400/60"}`}>
        TVL: {tvl} USDC
      </p>
    </motion.button>
  );
}

function DepositForm() {
  const searchParams = useSearchParams();
  const epochNum = parseInt(searchParams.get("epoch") || "0", 10);
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const wallet = useWallet();

  const { epochs, loading, error: epochsError } = useEpochs();

  const [tranche, setTranche] = useState<"senior" | "junior">("senior");
  const [amount, setAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const epoch = useMemo(
    () => epochs.find((e) => e.epochNumber.toNumber() === epochNum),
    [epochs, epochNum],
  );

  const seniorRate = epoch ? epoch.seniorFixedRateBps / 100 : 0;
  const durationDays = epoch ? getEpochDurationDays(epoch.duration) : 30;
  const seniorTvl = epoch ? epoch.seniorTotal.toNumber() / 1e6 : 0;
  const juniorTvl = epoch ? epoch.juniorTotal.toNumber() / 1e6 : 0;

  let juniorRate = 0;
  if (juniorTvl > 0 && seniorTvl > 0) {
    const totalTvl = seniorTvl + juniorTvl;
    const seniorYieldShare = (seniorRate / 100) * seniorTvl;
    const estimatedTotalYield = totalTvl * 0.12;
    juniorRate = ((estimatedTotalYield - seniorYieldShare) / juniorTvl) * 100;
  }

  const estimatedYield = amount
    ? (
        (parseFloat(amount) * (tranche === "senior" ? seniorRate : juniorRate)) /
        100 /
        (365 / durationDays)
      ).toFixed(2)
    : "0.00";

  const status = epoch ? getEpochStatusLabel(epoch.status) : "";
  const isOpen = status === "Open";

  async function handleDeposit() {
    if (!publicKey || !epoch || !amount) return;
    setDepositing(true);
    setError(null);
    setTxSig(null);

    try {
      const provider = new AnchorProvider(connection, wallet as never, {
        commitment: "confirmed",
      });
      const program = new Program(idl as never, provider);
      const encrypt = deriveEncryptAccounts(publicKey, STRATA_CORE_PROGRAM_ID);

      const [protocolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("protocol")],
        STRATA_CORE_PROGRAM_ID,
      );
      const [epochPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("epoch"), protocolPDA.toBuffer(), epoch.epochNumber.toArrayLike(Buffer, "le", 8)],
        STRATA_CORE_PROGRAM_ID,
      );
      const [epochVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("epoch_vault"), epochPDA.toBuffer()],
        STRATA_CORE_PROGRAM_ID,
      );

      const trancheByte = tranche === "senior" ? 0 : 1;
      const [positionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), epochPDA.toBuffer(), publicKey.toBuffer(), Buffer.from([trancheByte])],
        STRATA_CORE_PROGRAM_ID,
      );

      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const userUSDC = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      const amountLamports = new BN(Math.round(parseFloat(amount) * 1e6));
      const depositCiphertext = Keypair.generate();

      const depositIx = await (program.methods as unknown as DepositMethods)
        .deposit(tranche === "senior" ? { senior: {} } : { junior: {} }, amountLamports, encrypt.cpiAuthorityBump)
        .accounts({
          user: publicKey,
          protocol: protocolPDA,
          epoch: epochPDA,
          position: positionPDA,
          depositCiphertext: depositCiphertext.publicKey,
          userUsdc: userUSDC,
          epochVault: epochVault,
          usdcMint: USDC_MINT,
          tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          encryptProgram: ENCRYPT_PROGRAM_ID,
          encryptConfig: encrypt.configPda,
          encryptDeposit: encrypt.depositPda,
          encryptCpiAuthority: encrypt.cpiAuthority,
          callerProgram: STRATA_CORE_PROGRAM_ID,
          networkEncryptionKey: encrypt.networkKeyPda,
          encryptEventAuthority: encrypt.eventAuthority,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      depositIx.keys = depositIx.keys.map((meta: AccountMeta) =>
        meta.pubkey.equals(depositCiphertext.publicKey)
          ? { ...meta, isSigner: true, isWritable: true }
          : meta,
      );

      const tx = new Transaction();
      tx.add(depositIx);

      if (!wallet.signTransaction) throw new Error("Wallet does not support signTransaction");

      const latestBlockhash = await connection.getLatestBlockhash();
      tx.feePayer = publicKey;
      tx.recentBlockhash = latestBlockhash.blockhash;
      tx.partialSign(depositCiphertext);
      const signedTx = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
      setTxSig(sig);
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      if (msg.includes("already in use") || msg.includes("0x0")) {
        setError("You already have a position in this tranche for this epoch. Try the other tranche or a different epoch.");
      } else if (msg.includes("Account does not exist") || msg.includes("could not find account")) {
        setError("Your wallet does not have the required USDC token account for this protocol mint. Mint or receive the configured devnet USDC first, then try again.");
      } else {
        setError(msg);
      }
    } finally {
      setDepositing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 rounded shimmer" />
        <div className="h-32 rounded-2xl shimmer" />
      </div>
    );
  }

  if (!epoch) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl py-16 text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10">
            <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-semibold">Epoch Not Found</h2>
        <p className="mt-2 text-white/50">
          {epochsError
            ? `Could not load on-chain epochs: ${epochsError}`
            : `Epoch #${epochNum} doesn&apos;t exist on-chain yet.`}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight glow-text">Deposit</h1>
        <p className="text-white/50 text-sm mt-1">
          Epoch #{epochNum} &mdash; {getEpochDurationLabel(epoch.duration)} Pool
          {!isOpen && (
            <Badge variant="warning" className="ml-2">
              {status} &mdash; Deposits Closed
            </Badge>
          )}
        </p>
      </motion.div>

      <AddTokenBanner />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4"
      >
        <TrancheCard
          selected={tranche === "senior"}
          onClick={() => setTranche("senior")}
          apy={`${seniorRate.toFixed(2)}%`}
          tvl={`$${seniorTvl.toLocaleString()}`}
          label="Senior"
          desc="Guaranteed fixed rate. Principal protected by junior tranche."
          color="blue"
        />
        <TrancheCard
          selected={tranche === "junior"}
          onClick={() => setTranche("junior")}
          apy={juniorRate > 0 ? `~${juniorRate.toFixed(1)}%` : "\u2014"}
          tvl={`$${juniorTvl.toLocaleString()}`}
          label="Junior"
          desc="Gets all excess yield after senior is paid. Absorbs losses first."
          color="emerald"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <label className="text-sm font-medium text-white/70">Deposit Amount</label>
          <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent py-3 text-2xl font-semibold outline-none placeholder:text-white/20 text-white"
            />
            <div className="flex items-center gap-2 text-sm font-medium text-white/50">
              <div className="h-5 w-5 rounded-full bg-blue-500/80" />
              USDC
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-white/30">
            <span>Enter USDC amount</span>
            <div className="flex gap-2">
              {["100", "500", "1000"].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 hover:bg-white/10 hover:border-white/20 transition-all text-white/50"
                >
                  {parseInt(v) >= 1000 ? "1K" : v}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="space-y-3">
          <h3 className="font-semibold text-white/90">Transaction Summary</h3>
          {[
            { label: "Tranche", value: tranche.charAt(0).toUpperCase() + tranche.slice(1) },
            { label: "Deposit", value: `${amount || "0"} USDC` },
            {
              label: "APY",
              value:
                tranche === "senior"
                  ? `${seniorRate.toFixed(2)}%`
                  : juniorRate > 0
                    ? `~${juniorRate.toFixed(1)}%`
                    : "\u2014",
            },
            { label: `Est. Yield (${durationDays}d)`, value: `+${estimatedYield} USDC`, highlight: true },
            { label: "You Receive", value: `${amount || "0"} ${tranche === "senior" ? "srUSDC" : "jrUSDC"}` },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-white/40">{row.label}</span>
              <span className={row.highlight ? "font-medium text-emerald-400" : "font-medium text-white/80"}>
                {row.value}
              </span>
            </div>
          ))}

          <hr className="border-white/10" />

          <div className="flex justify-between text-sm">
            <span className="text-white/40">Platform Fee</span>
            <span className="font-medium text-white/60">0% on deposit</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Early Withdrawal Fee</span>
            <span className="font-medium text-white/60">1%</span>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}
        {txSig && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400"
          >
            Deposit successful!{" "}
            <a
              href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on Explorer
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {connected ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Button
            className="w-full"
            size="lg"
            disabled={!amount || parseFloat(amount) <= 0 || !isOpen || depositing}
            onClick={handleDeposit}
          >
            {depositing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Confirming...
              </span>
            ) : !isOpen ? (
              "Deposits Closed"
            ) : !amount ? (
              "Enter Amount"
            ) : (
              `Deposit ${amount} USDC into ${tranche === "senior" ? "Senior" : "Junior"} Tranche`
            )}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex justify-center"
        >
          <ConnectWalletPrompt minimal />
        </motion.div>
      )}
    </motion.div>
  );
}

export default function DepositPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-white/40">Loading...</div>
      }
    >
      <DepositForm />
    </Suspense>
  );
}
