"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import {
  useEpochs,
  getEpochDurationLabel,
  getEpochStatusLabel,
  type EpochState,
} from "@/hooks/useProtocol";
import { formatNumber, calculateTimeRemaining } from "@/lib/utils";

const statusVariant = (s: string) => {
  if (s === "Open") return "info" as const;
  if (s === "Active") return "success" as const;
  return "default" as const;
};

function PoolCard({ epoch }: { epoch: EpochState }) {
  const status = getEpochStatusLabel(epoch.status);
  const seniorAPY = `${(epoch.seniorFixedRateBps / 100).toFixed(2)}%`;
  const seniorTvl = epoch.seniorTotal.toNumber() / 1e6;
  const juniorTvl = epoch.juniorTotal.toNumber() / 1e6;
  const totalTvl = seniorTvl + juniorTvl;
  const timeLeft =
    status === "Active"
      ? calculateTimeRemaining(epoch.maturesAt.toNumber())
      : "";

  let juniorAPY = "—";
  if (juniorTvl > 0 && seniorTvl > 0) {
    const seniorYieldShare = (epoch.seniorFixedRateBps / 10000) * seniorTvl;
    const estimatedTotalYield = totalTvl * 0.12;
    const juniorYieldShare = estimatedTotalYield - seniorYieldShare;
    const juniorAPYNum = (juniorYieldShare / juniorTvl) * 100;
    juniorAPY = `~${juniorAPYNum.toFixed(1)}%`;
  }

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Epoch #{epoch.epochNumber.toNumber()}
          </h3>
          <Badge variant={statusVariant(status)}>{status}</Badge>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          {getEpochDurationLabel(epoch.duration)} epoch
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-blue-600">Senior (Fixed)</p>
            <p className="mt-1 text-lg font-semibold text-blue-700">
              {seniorAPY}
            </p>
            <p className="text-xs text-blue-400">
              ${formatNumber(seniorTvl)} TVL
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xs text-emerald-600">Junior (Variable)</p>
            <p className="mt-1 text-lg font-semibold text-emerald-700">
              {juniorAPY}
            </p>
            <p className="text-xs text-emerald-400">
              ${formatNumber(juniorTvl)} TVL
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
          <span>Total TVL</span>
          <span className="font-medium text-gray-700">
            ${formatNumber(totalTvl)}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {status === "Open" ? (
          <Link
            href={`/deposit?epoch=${epoch.epochNumber.toNumber()}`}
            className="block"
          >
            <Button className="w-full" size="md">
              Deposit Now
            </Button>
          </Link>
        ) : status === "Matured" ? (
          <Link href="/portfolio" className="block">
            <Button className="w-full" variant="outline" size="md">
              Withdraw
            </Button>
          </Link>
        ) : (
          <div className="text-center text-sm text-gray-400">
            {timeLeft} remaining
          </div>
        )}
      </div>
    </Card>
  );
}

export default function PoolsPage() {
  const { epochs, loading } = useEpochs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pools</h1>
          <p className="text-gray-500">Browse all yield tranching epochs</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-white"
            />
          ))}
        </div>
      ) : epochs.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-lg text-gray-400">No epochs available yet</p>
          <p className="mt-2 text-sm text-gray-400">
            The protocol hasn&apos;t created any epochs on devnet yet. Check back soon.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {epochs.map((epoch) => (
            <PoolCard key={epoch.epochNumber.toNumber()} epoch={epoch} />
          ))}
        </div>
      )}
    </div>
  );
}
