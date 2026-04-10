"use client";

import { useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  AccountMeta,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
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
  buildCreateEncryptDepositIx,
  deriveEncryptAccounts,
  ENCRYPT_PROGRAM_ID,
} from "@/lib/encrypt";
import idl from "@/lib/idl/strata_core.json";
import { AddTokenBanner } from "@/components/AddTokenBanner";

function DepositForm() {
  const searchParams = useSearchParams();
  const epochNum = parseInt(searchParams.get("epoch") || "0", 10);
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { epochs, loading } = useEpochs();

  const [tranche, setTranche] = useState<"senior" | "junior">("senior");
  const [amount, setAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const epoch = useMemo(
    () => epochs.find((e) => e.epochNumber.toNumber() === epochNum),
    [epochs, epochNum]
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
        (parseFloat(amount) *
          (tranche === "senior" ? seniorRate : juniorRate)) /
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
        STRATA_CORE_PROGRAM_ID
      );
      const [epochPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("epoch"),
          protocolPDA.toBuffer(),
          epoch.epochNumber.toArrayLike(Buffer, "le", 8),
        ],
        STRATA_CORE_PROGRAM_ID
      );
      const [epochVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("epoch_vault"), epochPDA.toBuffer()],
        STRATA_CORE_PROGRAM_ID
      );

      const trancheByte = tranche === "senior" ? 0 : 1;
      const [positionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("position"),
          epochPDA.toBuffer(),
          publicKey.toBuffer(),
          Buffer.from([trancheByte]),
        ],
        STRATA_CORE_PROGRAM_ID
      );

      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const userUSDC = await getAssociatedTokenAddress(USDC_MINT, publicKey);

      const amountLamports = new BN(parseFloat(amount) * 1e6);
      const trancheArg = tranche === "senior" ? { senior: {} } : { junior: {} };
      const depositCiphertext = Keypair.generate();
      const ensureDepositIx = await buildCreateEncryptDepositIx(
        connection,
        publicKey,
        STRATA_CORE_PROGRAM_ID
      );

      const depositIx = await (program.methods as any)
        .deposit(trancheArg, amountLamports, encrypt.cpiAuthorityBump)
        .accounts({
          user: publicKey,
          protocol: protocolPDA,
          epoch: epochPDA,
          position: positionPDA,
          depositCiphertext: depositCiphertext.publicKey,
          userUsdc: userUSDC,
          epochVault: epochVault,
          usdcMint: USDC_MINT,
          tokenProgram: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
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
          : meta
      );

      const tx = new Transaction();
      if (ensureDepositIx) {
        tx.add(ensureDepositIx);
      }
      tx.add(depositIx);

      const sig = await sendTransaction(tx, connection, {
        signers: [depositCiphertext],
        skipPreflight: false,
      });

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      setTxSig(sig);

      try {
        const mintRes = await fetch("/api/mint-tranche", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userPubkey: publicKey.toBase58(),
            trancheType: tranche,
            amount: amountLamports.toString(),
          }),
        });
        const mintData = await mintRes.json();
        if (!mintData.success) {
          console.error("Mint failed:", mintData.error);
        }
      } catch (mintErr) {
        console.error("Mint request failed:", mintErr);
      }
    } catch (e: any) {
      const msg = e.message || "Transaction failed";
      if (msg.includes("already in use") || msg.includes("0x0")) {
        setError(
          "You already have a position in this tranche for this epoch. Try the other tranche or a different epoch."
        );
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
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-white" />
      </div>
    );
  }

  if (!epoch) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h2 className="text-xl font-semibold">Epoch Not Found</h2>
        <p className="mt-2 text-gray-500">
          Epoch #{epochNum} doesn&apos;t exist on-chain yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deposit</h1>
        <p className="text-gray-500">
          Epoch #{epochNum} - {getEpochDurationLabel(epoch.duration)} Pool
          {!isOpen && (
            <Badge variant="warning" className="ml-2">
              {status} - Deposits Closed
            </Badge>
          )}
        </p>
      </div>

      <AddTokenBanner />

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setTranche("senior")}
          className={`rounded-2xl border-2 p-5 text-left transition-all ${
            tranche === "senior"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-100 bg-white hover:border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <Badge variant="info">Senior</Badge>
            <span className="text-xl font-bold text-blue-600">
              {seniorRate.toFixed(2)}%
            </span>
          </div>
          <p className="mt-2 text-sm font-medium">Fixed Yield</p>
          <p className="mt-1 text-xs text-gray-400">
            Guaranteed fixed rate. Principal protected by junior tranche. Lower
            risk, predictable returns.
          </p>
          <p className="mt-2 text-xs text-blue-500">
            TVL: ${seniorTvl.toLocaleString()} USDC
          </p>
        </button>

        <button
          onClick={() => setTranche("junior")}
          className={`rounded-2xl border-2 p-5 text-left transition-all ${
            tranche === "junior"
              ? "border-emerald-500 bg-emerald-50"
              : "border-gray-100 bg-white hover:border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <Badge variant="success">Junior</Badge>
            <span className="text-xl font-bold text-emerald-600">
              {juniorRate > 0 ? `~${juniorRate.toFixed(1)}%` : "—"}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium">Leveraged Variable Yield</p>
          <p className="mt-1 text-xs text-gray-400">
            Gets all excess yield after senior is paid. Higher returns but
            absorbs losses first.
          </p>
          <p className="mt-2 text-xs text-emerald-500">
            TVL: ${juniorTvl.toLocaleString()} USDC
          </p>
        </button>
      </div>

      <Card>
        <label className="text-sm font-medium text-gray-700">
          Deposit Amount
        </label>
        <div className="mt-2 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent py-3 text-2xl font-semibold outline-none placeholder:text-gray-300"
          />
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <div className="h-5 w-5 rounded-full bg-blue-500" />
            USDC
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>Enter USDC amount</span>
          <div className="flex gap-2">
            <button
              onClick={() => setAmount("100")}
              className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
            >
              100
            </button>
            <button
              onClick={() => setAmount("500")}
              className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
            >
              500
            </button>
            <button
              onClick={() => setAmount("1000")}
              className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200"
            >
              1K
            </button>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold">Transaction Summary</h3>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tranche</span>
          <span className="font-medium capitalize">{tranche}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Deposit</span>
          <span className="font-medium">{amount || "0"} USDC</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">APY</span>
          <span className="font-medium">
            {tranche === "senior"
              ? `${seniorRate.toFixed(2)}%`
              : juniorRate > 0
              ? `~${juniorRate.toFixed(1)}%`
              : "—"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Est. Yield ({durationDays}d)</span>
          <span className="font-medium text-emerald-600">
            +{estimatedYield} USDC
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">You Receive</span>
          <span className="font-medium">
            {amount || "0"} {tranche === "senior" ? "srUSDC" : "jrUSDC"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Encrypt Privacy</span>
          <span className="font-medium text-[var(--omnyie-red)]">
            Private position ciphertext created
          </span>
        </div>
        <hr className="border-gray-100" />
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Platform Fee</span>
          <span className="font-medium">0% on deposit</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Early Withdrawal Fee</span>
          <span className="font-medium">1%</span>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {txSig && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Deposit successful! Private position ciphertext was created.{" "}
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Explorer
          </a>
        </div>
      )}

      {connected ? (
        <Button
          className="w-full"
          size="lg"
          disabled={!amount || parseFloat(amount) <= 0 || !isOpen || depositing}
          onClick={handleDeposit}
        >
          {depositing
            ? "Confirming..."
            : !isOpen
            ? "Deposits Closed"
            : !amount
            ? "Enter Amount"
            : `Deposit ${amount} USDC into ${tranche === "senior" ? "Senior" : "Junior"} Tranche`}
        </Button>
      ) : (
        <Button className="w-full" size="lg" variant="secondary">
          Connect Wallet to Deposit
        </Button>
      )}
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-gray-400">Loading...</div>
      }
    >
      <DepositForm />
    </Suspense>
  );
}
