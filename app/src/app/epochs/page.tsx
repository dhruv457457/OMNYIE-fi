"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useEpochs,
  useProtocol,
  getEpochDurationLabel,
  getEpochStatusLabel,
} from "@/hooks/useProtocol";
import { formatNumber } from "@/lib/utils";

const statusVariant = (s: string) => {
  if (s === "Open") return "info" as const;
  if (s === "Active") return "success" as const;
  return "default" as const;
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.3 },
  }),
};

export default function EpochsPage() {
  const { connected } = useWallet();

  const { epochs, loading: epochsLoading, error: epochsError } = useEpochs();
  const { loading: protocolLoading, error: protocolError } = useProtocol();
  const loading = epochsLoading || protocolLoading;

  const maturedEpochs = epochs.filter((e) => "matured" in e.status);
  const avgSeniorBps =
    epochs.length > 0
      ? epochs.reduce((s, e) => s + e.seniorFixedRateBps, 0) / epochs.length
      : 0;
  const totalYieldGenerated = epochs.reduce(
    (s, e) => s + e.totalYieldHarvested.toNumber() / 1e6, 0,
  );

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
      >
        <h1 className="text-3xl font-bold tracking-tight glow-text">Epoch History</h1>
        <p className="text-white/50 text-sm mt-1">
          Complete history of all yield tranching epochs
        </p>
      </motion.div>

      {loading ? (
        <div className="rounded-2xl shimmer h-64" />
      ) : epochs.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-lg text-white/50">
            {epochsError || protocolError ? "Could not load epoch history" : "No epoch history yet"}
          </p>
          <p className="mt-2 text-sm text-white/30">
            {epochsError || protocolError || "Epochs will appear here once the protocol creates them on devnet."}
          </p>
        </Card>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                  <th className="px-6 py-3">Epoch</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Senior APY</th>
                  <th className="px-6 py-3">Junior APY</th>
                  <th className="px-6 py-3">Senior TVL</th>
                  <th className="px-6 py-3">Junior TVL</th>
                  <th className="px-6 py-3">Total Yield</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {epochs.map((e, i) => {
                  const status = getEpochStatusLabel(e.status);
                  const seniorTvl = e.seniorTotal.toNumber() / 1e6;
                  const juniorTvl = e.juniorTotal.toNumber() / 1e6;
                  const yieldHarvested = e.totalYieldHarvested.toNumber() / 1e6;
                  const juniorYield = e.juniorYieldDistributed.toNumber() / 1e6;

                  let juniorAPY = "Pending";
                  if ("matured" in e.status && juniorTvl > 0 && juniorYield > 0) {
                    const durationDays = e.duration
                      ? "sevenDays" in e.duration ? 7
                        : "fourteenDays" in e.duration ? 14 : 30
                      : 30;
                    const annualized = (juniorYield / juniorTvl) * (365 / durationDays) * 100;
                    juniorAPY = `${annualized.toFixed(1)}%`;
                  }

                  return (
                    <motion.tr
                      key={e.epochNumber.toNumber()}
                      custom={i}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      className="group transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4 font-medium text-white/80">
                        #{e.epochNumber.toNumber()}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/50">
                        {getEpochDurationLabel(e.duration)}
                      </td>
                      <td className="px-6 py-4 font-medium text-blue-400">
                        {(e.seniorFixedRateBps / 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 font-medium text-emerald-400">
                        {juniorAPY}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60">
                        ${formatNumber(seniorTvl)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60">
                        ${formatNumber(juniorTvl)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60">
                        {yieldHarvested > 0 ? `$${formatNumber(yieldHarvested)}` : "\u2014"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant(status)}>{status}</Badge>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <h2 className="text-lg font-semibold text-white/90">Yield Performance Summary</h2>
              <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
                <div>
                  <p className="text-sm text-white/40">Avg Senior APY</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {avgSeniorBps > 0 ? `${(avgSeniorBps / 100).toFixed(2)}%` : "\u2014"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Total Epochs</p>
                  <p className="text-2xl font-bold text-white/90">{epochs.length}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Total Yield Generated</p>
                  <p className="text-2xl font-bold text-white/90">
                    {totalYieldGenerated > 0 ? `$${formatNumber(totalYieldGenerated)}` : "\u2014"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Matured Epochs</p>
                  <p className="text-2xl font-bold text-white/90">{maturedEpochs.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
