"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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

export default function EpochsPage() {
  const { epochs, loading: epochsLoading } = useEpochs();
  const { protocol, loading: protocolLoading } = useProtocol();
  const loading = epochsLoading || protocolLoading;

  // Calculate averages from real data
  const maturedEpochs = epochs.filter((e) => "matured" in e.status);
  const avgSeniorBps =
    epochs.length > 0
      ? epochs.reduce((s, e) => s + e.seniorFixedRateBps, 0) / epochs.length
      : 0;
  const totalYieldGenerated = epochs.reduce(
    (s, e) => s + e.totalYieldHarvested.toNumber() / 1e6,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Epoch History</h1>
        <p className="text-gray-500">
          Complete history of all yield tranching epochs
        </p>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-white" />
      ) : epochs.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-lg text-gray-400">No epoch history yet</p>
          <p className="mt-2 text-sm text-gray-400">
            Epochs will appear here once the protocol creates them on devnet.
          </p>
        </Card>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
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
              <tbody className="divide-y divide-gray-50">
                {epochs.map((e) => {
                  const status = getEpochStatusLabel(e.status);
                  const seniorTvl = e.seniorTotal.toNumber() / 1e6;
                  const juniorTvl = e.juniorTotal.toNumber() / 1e6;
                  const yieldHarvested = e.totalYieldHarvested.toNumber() / 1e6;
                  const juniorYield = e.juniorYieldDistributed.toNumber() / 1e6;

                  let juniorAPY = "Pending";
                  if (
                    "matured" in e.status &&
                    juniorTvl > 0 &&
                    juniorYield > 0
                  ) {
                    const durationDays = e.duration
                      ? "sevenDays" in e.duration
                        ? 7
                        : "fourteenDays" in e.duration
                        ? 14
                        : 30
                      : 30;
                    const annualized =
                      (juniorYield / juniorTvl) * (365 / durationDays) * 100;
                    juniorAPY = `${annualized.toFixed(1)}%`;
                  }

                  return (
                    <tr
                      key={e.epochNumber.toNumber()}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-4 font-medium">
                        #{e.epochNumber.toNumber()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getEpochDurationLabel(e.duration)}
                      </td>
                      <td className="px-6 py-4 font-medium text-blue-600">
                        {(e.seniorFixedRateBps / 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 font-medium text-emerald-600">
                        {juniorAPY}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        ${formatNumber(seniorTvl)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        ${formatNumber(juniorTvl)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {yieldHarvested > 0
                          ? `$${formatNumber(yieldHarvested)}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant(status)}>
                          {status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Yield Performance Card */}
          <Card>
            <h2 className="text-lg font-semibold">Yield Performance Summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-400">Avg Senior APY</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {avgSeniorBps > 0
                    ? `${(avgSeniorBps / 100).toFixed(2)}%`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Epochs</p>
                <p className="text-2xl font-semibold">{epochs.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Yield Generated</p>
                <p className="text-2xl font-semibold">
                  {totalYieldGenerated > 0
                    ? `$${formatNumber(totalYieldGenerated)}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Matured Epochs</p>
                <p className="text-2xl font-semibold">
                  {maturedEpochs.length}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
