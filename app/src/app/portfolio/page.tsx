"use client";

import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
}: {
  pos: UserPositionState;
  epoch?: EpochState;
  onWithdrawn: () => void;
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
    <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            isSenior
              ? "bg-blue-100 text-blue-700"
              : "bg-emerald-100 text-emerald-700"
          } text-sm font-bold`}
        >
          #{epochNum}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Epoch #{epochNum}</span>
            <Badge variant={isSenior ? "info" : "success"}>
              {trancheLabel}
            </Badge>
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
          <p className="text-sm text-gray-400">
            {pos.trancheTokensMinted.toNumber() / 1e6}{" "}
            {isSenior ? "srUSDC" : "jrUSDC"}
          </p>
          <p className="mt-1 text-xs text-[var(--omnyie-red)]">
            Encrypt privacy: encrypted deposit mirror stored on-chain; safe withdrawal remains available even if decryptor is delayed
          </p>
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          {txSig && (
            <p className="mt-1 text-xs text-emerald-600">
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

      <div className="flex items-center gap-8">
        <div className="text-right">
          <p className="text-xs text-gray-400">Deposited</p>
          <p className="font-medium">
            {pos.decryptionPending ? "Private" : `$${formatNumber(deposited)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">APY</p>
          <p className="font-medium">{isSenior ? apy : "Variable"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Yield Claimed</p>
          <p className="font-medium text-emerald-600">
            ${formatNumber(pos.yieldClaimed.toNumber() / 1e6)}
          </p>
        </div>
        {canWithdraw && (
          <div className="flex flex-col items-end gap-2">
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
          </div>
        )}
      </div>
    </Card>
  );
}

export default function PortfolioPage() {
  const { connected } = useWallet();
  const {
    positions,
    loading: positionsLoading,
    refresh: refreshPositions,
  } = useUserPositions();
  const { epochs, loading: epochsLoading } = useEpochs();

  const loading = positionsLoading || epochsLoading;

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--omnyie-red-50)]">
          <svg
            className="h-8 w-8 text-[var(--omnyie-red)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
        <p className="mt-2 max-w-md text-gray-500">
          Connect your Solana wallet to view your yield tranche positions,
          earned yield, and withdrawal options.
        </p>
      </div>
    );
  }

  const epochMap = new Map<string, EpochState>();
  epochs.forEach((e) => epochMap.set(e.publicKey.toBase58(), e));

  const totalDeposited = positions.reduce(
    (s, p) => s + p.depositedAmount.toNumber() / 1e6,
    0
  );
  const totalYield = positions.reduce(
    (s, p) => s + p.yieldClaimed.toNumber() / 1e6,
    0
  );
  const activeCount = positions.filter((p) => !p.withdrawn).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-gray-500">Your yield tranche positions</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-white"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Total Deposited"
            value={`$${formatNumber(totalDeposited)}`}
          />
          <StatCard
            label="Total Yield Earned"
            value={`$${formatNumber(totalYield)}`}
            sub="Across all epochs"
            trend="up"
          />
          <StatCard label="Active Positions" value={activeCount.toString()} />
          <StatCard
            label="Total Positions"
            value={positions.length.toString()}
          />
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Positions</h2>

        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-white"
              />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-gray-400">No positions yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Deposit into an epoch to start earning yield.
            </p>
          </Card>
        ) : (
          positions.map((pos) => (
            <PositionCard
              key={pos.publicKey.toBase58()}
              pos={pos}
              epoch={epochMap.get(pos.epoch.toBase58())}
              onWithdrawn={refreshPositions}
            />
          ))
        )}
      </div>
    </div>
  );
}
