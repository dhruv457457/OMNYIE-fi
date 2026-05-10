"use client";

import { motion } from "framer-motion";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useUserPositions,
  useEpochs,
  useWithdraw,
  getTrancheLabel,
  getEpochStatusLabel,
  type UserPositionState,
  type EpochState,
} from "@/hooks/useProtocol";
import { formatNumber } from "@/lib/utils";

function PositionCard({
  pos,
  epoch,
  onWithdrawn,
  index,
}: {
  pos: UserPositionState;
  epoch?: EpochState;
  onWithdrawn: () => void;
  index: number;
}) {
  const trancheLabel = getTrancheLabel(pos.trancheType);
  const isSenior = "senior" in pos.trancheType;
  const deposited = pos.depositedAmount.toNumber() / 1e6;
  const epochStatus = epoch ? getEpochStatusLabel(epoch.status) : "Unknown";
  const apy = epoch ? `${(epoch.seniorFixedRateBps / 100).toFixed(2)}%` : "--";
  const epochNum = epoch ? epoch.epochNumber.toNumber() : "?";
  const canWithdraw = epochStatus === "Matured" && !pos.withdrawn;

  const { fallbackWithdraw, withdrawing, stage, error, txSig } = useWithdraw();

  async function handleFallbackWithdraw() {
    if (!epoch) return;
    await fallbackWithdraw(pos, epoch);
    onWithdrawn();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -2 }}
    >
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.3 }}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isSenior
                ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            } text-sm font-bold`}
          >
            #{epochNum}
          </motion.div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white/90">Epoch #{epochNum}</span>
              <Badge variant={isSenior ? "info" : "success"}>{trancheLabel}</Badge>
              <Badge
                variant={
                  epochStatus === "Matured"
                    ? "success"
                    : epochStatus === "Active"
                      ? "warning"
                      : "default"
                }
              >
                {epochStatus}
              </Badge>
              {pos.withdrawn && <Badge variant="default">Withdrawn</Badge>}
            </div>
            <p className="text-sm text-white/40 mt-0.5">
              {pos.trancheTokensMinted.toNumber() / 1e6} {isSenior ? "srUSDC" : "jrUSDC"}
            </p>
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
            {txSig && (
              <p className="mt-1 text-xs text-emerald-400">
                Transaction sent.{" "}
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  View tx
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 md:gap-8 flex-wrap">
          <div className="text-right">
            <p className="text-xs text-white/40">Deposited</p>
            <p className="font-medium text-white/80">
              {pos.decryptionPending ? "Private" : `$${formatNumber(deposited)}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">APY</p>
            <p className="font-medium text-white/80">{isSenior ? apy : "Variable"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">Yield Claimed</p>
            <p className="font-medium text-emerald-400">
              ${formatNumber(pos.yieldClaimed.toNumber() / 1e6)}
            </p>
          </div>
          {canWithdraw && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleFallbackWithdraw}
              disabled={withdrawing}
            >
              {withdrawing && stage === "withdrawing"
                ? "Withdrawing..."
                : "Withdraw Safely"}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default function PortfolioPage() {
  const { connected } = useWallet();

  const {
    positions,
    loading: positionsLoading,
    error: positionsError,
    refresh: refreshPositions,
  } = useUserPositions();
  const { epochs, loading: epochsLoading, error: epochsError } = useEpochs();
  const loading = positionsLoading || epochsLoading;

  if (!connected) {
    return <ConnectWalletPrompt />;
  }

  const epochMap = new Map<string, EpochState>();
  epochs.forEach((e) => epochMap.set(e.publicKey.toBase58(), e));

  const totalDeposited = positions.reduce(
    (s, p) => s + p.depositedAmount.toNumber() / 1e6, 0,
  );
  const totalYield = positions.reduce(
    (s, p) => s + p.yieldClaimed.toNumber() / 1e6, 0,
  );
  const activeCount = positions.filter((p) => !p.withdrawn).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold tracking-tight glow-text">Portfolio</h1>
        <p className="text-white/50 text-sm mt-1">Your yield tranche positions</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <StatCard
          loading={loading}
          label="Total Deposited"
          value={`$${formatNumber(totalDeposited)}`}
        />
        <StatCard
          loading={loading}
          label="Total Yield Earned"
          value={`$${formatNumber(totalYield)}`}
          sub="Across all epochs"
          trend="up"
        />
        <StatCard
          loading={loading}
          label="Active Positions"
          value={activeCount.toString()}
        />
        <StatCard
          loading={loading}
          label="Total Positions"
          value={positions.length.toString()}
        />
      </motion.div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white/90">Your Positions</h2>

        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl shimmer" />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-white/50">
              {positionsError || epochsError ? "Could not load positions" : "No positions yet"}
            </p>
            <p className="mt-1 text-sm text-white/30">
              {positionsError || epochsError || "Deposit into an on-chain epoch to start earning yield."}
            </p>
          </Card>
        ) : (
          positions.map((pos, i) => (
            <PositionCard
              key={pos.publicKey.toBase58()}
              pos={pos}
              epoch={epochMap.get(pos.epoch.toBase58())}
              onWithdrawn={refreshPositions}
              index={i}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}
