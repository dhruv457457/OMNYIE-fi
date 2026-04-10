"use client";

import { StatCard, Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import {
  useProtocol,
  useEpochs,
  getEpochDurationLabel,
  getEpochStatusLabel,
  type EpochState,
} from "@/hooks/useProtocol";
import { formatNumber, calculateTimeRemaining } from "@/lib/utils";
import { AddTokenBanner } from "@/components/AddTokenBanner";

function EpochRow({ epoch }: { epoch: EpochState }) {
  const status = getEpochStatusLabel(epoch.status);
  const seniorAPY = `${(epoch.seniorFixedRateBps / 100).toFixed(2)}%`;
  const seniorTvl = epoch.seniorTotal.toNumber() / 1e6;
  const juniorTvl = epoch.juniorTotal.toNumber() / 1e6;
  const totalTvl = seniorTvl + juniorTvl;

  // Estimate junior APY if there are deposits
  let juniorAPY = "—";
  if (juniorTvl > 0 && seniorTvl > 0) {
    const seniorYieldShare = (epoch.seniorFixedRateBps / 10000) * seniorTvl;
    const estimatedTotalYield = (totalTvl * 0.12); // ~12% base assumption
    const juniorYieldShare = estimatedTotalYield - seniorYieldShare;
    const juniorAPYNum = (juniorYieldShare / juniorTvl) * 100;
    juniorAPY = `~${juniorAPYNum.toFixed(1)}%`;
  }

  const timeLeft =
    status === "Active"
      ? calculateTimeRemaining(epoch.maturesAt.toNumber())
      : status === "Open"
      ? "Accepting deposits"
      : "Completed";

  return (
    <tr className="transition-colors hover:bg-gray-50/50">
      <td className="px-6 py-4 font-medium">#{epoch.epochNumber.toNumber()}</td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {getEpochDurationLabel(epoch.duration)}
      </td>
      <td className="px-6 py-4">
        <span className="font-medium text-blue-600">{seniorAPY}</span>
      </td>
      <td className="px-6 py-4">
        <span className="font-medium text-emerald-600">{juniorAPY}</span>
      </td>
      <td className="px-6 py-4 text-sm">
        <div>
          <span className="text-gray-500">Sr:</span> ${formatNumber(seniorTvl)}
        </div>
        <div>
          <span className="text-gray-500">Jr:</span> ${formatNumber(juniorTvl)}
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge variant={status === "Active" ? "success" : status === "Open" ? "info" : "default"}>
          {status}
        </Badge>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">{timeLeft}</td>
      <td className="px-6 py-4">
        <Link href={`/deposit?epoch=${epoch.epochNumber.toNumber()}`}>
          <Button
            size="sm"
            variant={status === "Open" ? "primary" : "outline"}
          >
            {status === "Open" ? "Deposit" : "View"}
          </Button>
        </Link>
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const { protocol, loading: protocolLoading } = useProtocol();
  const { epochs, loading: epochsLoading } = useEpochs();

  const loading = protocolLoading || epochsLoading;

  const tvl = protocol ? protocol.totalTvl.toNumber() / 1e6 : 0;
  const epochCount = protocol ? protocol.epochCount.toNumber() : 0;
  const activeEpochs = epochs.filter(
    (e) => "active" in e.status || "open" in e.status
  ).length;

  // Calculate average APYs from real epochs
  let avgSenior = "—";
  let avgJunior = "—";
  if (epochs.length > 0) {
    const avgBps =
      epochs.reduce((s, e) => s + e.seniorFixedRateBps, 0) / epochs.length;
    avgSenior = `${(avgBps / 100).toFixed(2)}%`;
    avgJunior = "Variable";
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500">
          Split DeFi yield by risk. Fixed returns for senior, leveraged returns
          for junior.
        </p>
      </div>

      {/* Devnet Token Banner */}
      <AddTokenBanner />

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-white"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard
            label="Total Value Locked"
            value={tvl > 0 ? `$${formatNumber(tvl)}` : "$0"}
          />
          <StatCard label="Total Epochs" value={epochCount.toString()} />
          <StatCard label="Active Epochs" value={activeEpochs.toString()} />
          <StatCard label="Avg Senior APY" value={avgSenior} sub="Fixed rate" />
          <StatCard
            label="Junior APY"
            value={avgJunior}
            sub="Variable (leveraged)"
          />
        </div>
      )}

      {/* How It Works */}
      <Card>
        <h2 className="text-lg font-semibold">How OMNYIE Finance Works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[var(--omnyie-red-50)] p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--omnyie-red-100)] text-sm font-bold text-[var(--omnyie-red)]">
              1
            </div>
            <h3 className="font-medium">Choose Your Risk</h3>
            <p className="mt-1 text-sm text-gray-500">
              Senior tranche = fixed yield, protected principal. Junior tranche =
              leveraged variable yield, higher risk.
            </p>
          </div>
          <div className="rounded-xl bg-[var(--omnyie-red-50)] p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--omnyie-red-100)] text-sm font-bold text-[var(--omnyie-red)]">
              2
            </div>
            <h3 className="font-medium">Deposit USDC</h3>
            <p className="mt-1 text-sm text-gray-500">
              Deposit into an epoch (7/14/30 days). Your USDC earns yield from
              Kamino vaults on Solana.
            </p>
          </div>
          <div className="rounded-xl bg-[var(--omnyie-red-50)] p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--omnyie-red-100)] text-sm font-bold text-[var(--omnyie-red)]">
              3
            </div>
            <h3 className="font-medium">Collect Returns</h3>
            <p className="mt-1 text-sm text-gray-500">
              When the epoch matures, withdraw principal + yield. Senior gets paid
              first, junior gets the rest.
            </p>
          </div>
        </div>
      </Card>

      {/* Active Pools Table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Pools</h2>
          <Link href="/pools">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-white" />
        ) : epochs.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-gray-400">
              No epochs created yet. The protocol hasn&apos;t been initialized on devnet.
            </p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3">Epoch</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Senior APY</th>
                  <th className="px-6 py-3">Junior APY</th>
                  <th className="px-6 py-3">TVL</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Time Left</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {epochs
                  .filter((e) => "active" in e.status || "open" in e.status)
                  .map((epoch) => (
                    <EpochRow
                      key={epoch.epochNumber.toNumber()}
                      epoch={epoch}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
