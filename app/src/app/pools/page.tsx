"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";
import { useWallet } from "@solana/wallet-adapter-react";
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

function PoolCard({ epoch, index }: { epoch: EpochState; index: number }) {
  const status = getEpochStatusLabel(epoch.status);
  const seniorAPY = `${(epoch.seniorFixedRateBps / 100).toFixed(2)}%`;
  const seniorTvl = epoch.seniorTotal.toNumber() / 1e6;
  const juniorTvl = epoch.juniorTotal.toNumber() / 1e6;
  const totalTvl = seniorTvl + juniorTvl;
  const timeLeft =
    status === "Active"
      ? calculateTimeRemaining(epoch.maturesAt.toNumber())
      : "";

  let juniorAPY = "\u2014";
  if (juniorTvl > 0 && seniorTvl > 0) {
    const seniorYieldShare = (epoch.seniorFixedRateBps / 10000) * seniorTvl;
    const estimatedTotalYield = totalTvl * 0.12;
    const juniorYieldShare = estimatedTotalYield - seniorYieldShare;
    const juniorAPYNum = (juniorYieldShare / juniorTvl) * 100;
    juniorAPY = `~${juniorAPYNum.toFixed(1)}%`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -6 }}
    >
      <Card className="flex flex-col justify-between h-full border-white/10 hover:border-omnyie/20 transition-all">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white/90">
              Epoch #{epoch.epochNumber.toNumber()}
            </h3>
            <Badge variant={statusVariant(status)}>{status}</Badge>
          </div>
          <p className="mt-1 text-sm text-white/40">
            {getEpochDurationLabel(epoch.duration)} epoch
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
              <p className="text-xs text-blue-400">Senior (Fixed)</p>
              <p className="mt-1 text-xl font-bold text-blue-400">{seniorAPY}</p>
              <p className="text-xs text-blue-400/60">
                ${formatNumber(seniorTvl)} TVL
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-xs text-emerald-400">Junior (Variable)</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">{juniorAPY}</p>
              <p className="text-xs text-emerald-400/60">
                ${formatNumber(juniorTvl)} TVL
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-white/40">Total TVL</span>
            <span className="font-medium text-white/80">
              ${formatNumber(totalTvl)}
            </span>
          </div>
        </div>

        <div className="mt-5">
          {status === "Open" ? (
            <Link href={`/deposit?epoch=${epoch.epochNumber.toNumber()}`} className="block">
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
            <div className="text-center text-sm text-white/40">
              {timeLeft} remaining
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export default function PoolsPage() {
  const { connected } = useWallet();
  const { epochs, loading, error } = useEpochs();

  if (!connected) {
    return <ConnectWalletPrompt />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight glow-text">Pools</h1>
          <p className="text-white/50 text-sm mt-1">Browse all yield tranching epochs</p>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl shimmer" />
          ))}
        </div>
      ) : epochs.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-white/50">
            {error ? "Could not load vaults" : "No epochs available yet"}
          </p>
          <p className="mt-2 text-sm text-white/30">
            {error || "The protocol has not created any on-chain epochs for this devnet yet."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {epochs.map((epoch, i) => (
            <PoolCard key={epoch.epochNumber.toNumber()} epoch={epoch} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
