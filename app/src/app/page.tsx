"use client";

import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { StatCard, Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  BadgeDollarSign,
  CandlestickChart,
  ChartNoAxesCombined,
  ChevronRight,
  Clock3,
  Landmark,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Vault,
} from "lucide-react";


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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const marketingCards = [
  {
    icon: ShieldCheck,
    title: "Senior vault",
    desc: "Fixed yield with first-priority repayment at maturity.",
    tone: "text-blue-300",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Junior vault",
    desc: "Takes excess yield after senior is paid for higher upside.",
    tone: "text-emerald-300",
  },
  {
    icon: LockKeyhole,
    title: "Private accounting",
    desc: "Encrypted deposit data keeps position flows cleaner on-chain.",
    tone: "text-omnyie-light",
  },
];

const vaultFlow = [
  "Deposit USDC",
  "Vault earns yield",
  "Senior paid first",
  "Junior captures upside",
];

function EpochRow({ epoch }: { epoch: EpochState }) {
  const status = getEpochStatusLabel(epoch.status);
  const seniorAPY = `${(epoch.seniorFixedRateBps / 100).toFixed(2)}%`;
  const seniorTvl = epoch.seniorTotal.toNumber() / 1e6;
  const juniorTvl = epoch.juniorTotal.toNumber() / 1e6;
  const totalTvl = seniorTvl + juniorTvl;

  let juniorAPY = "\u2014";
  if (juniorTvl > 0 && seniorTvl > 0) {
    const seniorYieldShare = (epoch.seniorFixedRateBps / 10000) * seniorTvl;
    const estimatedTotalYield = totalTvl * 0.12;
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
    <motion.tr
      variants={itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="group transition-colors hover:bg-white/[0.02]"
    >
      <td className="px-6 py-4">
        <span className="font-medium text-white/80">#{epoch.epochNumber.toNumber()}</span>
      </td>
      <td className="px-6 py-4 text-sm text-white/50">
        {getEpochDurationLabel(epoch.duration)}
      </td>
      <td className="px-6 py-4">
        <span className="font-medium text-blue-400">{seniorAPY}</span>
      </td>
      <td className="px-6 py-4">
        <span className="font-medium text-emerald-400">{juniorAPY}</span>
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="text-white/60">
          Sr: <span className="text-white/80">${formatNumber(seniorTvl)}</span>
        </div>
        <div className="text-white/60">
          Jr: <span className="text-white/80">${formatNumber(juniorTvl)}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge variant={status === "Active" ? "success" : status === "Open" ? "info" : "default"}>
          {status}
        </Badge>
      </td>
      <td className="px-6 py-4 text-sm text-white/40">{timeLeft}</td>
      <td className="px-6 py-4">
        <Link href={`/deposit?epoch=${epoch.epochNumber.toNumber()}`}>
          <Button size="sm" variant={status === "Open" ? "primary" : "outline"}>
            {status === "Open" ? "Deposit" : "View"}
          </Button>
        </Link>
      </td>
    </motion.tr>
  );
}

export default function Dashboard() {
  const { connected } = useWallet();
  const { protocol, loading: protocolLoading, error: protocolError } = useProtocol();
  const { epochs, loading: epochsLoading, error: epochsError } = useEpochs();
  const loading = protocolLoading || epochsLoading;

  const tvl = protocol ? protocol.totalTvl.toNumber() / 1e6 : 0;
  const epochCount = protocol ? protocol.epochCount.toNumber() : 0;
  const activeEpochs = epochs.filter(
    (e) => "active" in e.status || "open" in e.status,
  ).length;

  let avgSenior = "\u2014";
  if (epochs.length > 0) {
    const avgBps = epochs.reduce((s, e) => s + e.seniorFixedRateBps, 0) / epochs.length;
    avgSenior = `${(avgBps / 100).toFixed(2)}%`;
  }

  if (!connected) {
    return (
      <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-6 h-72 w-72 -translate-x-1/2 rounded-full border border-omnyie/15" />
        <div className="pointer-events-none absolute left-1/2 top-6 h-72 w-72 -translate-x-1/2 rounded-full border border-white/5 animate-orbit-dot" />
        <div className="relative z-10 grid min-h-[calc(100vh-5rem)] items-center gap-10 px-2 py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="relative text-center lg:text-left"
          >
            <div className="absolute -inset-20 bg-gradient-radial from-omnyie/15 via-transparent to-transparent rounded-full blur-3xl" />

            <div className="relative mb-7 inline-flex items-center gap-3 rounded-lg border border-omnyie/25 bg-omnyie/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-omnyie-light red-scanline">
              <Sparkles className="h-3.5 w-3.5" />
              Structured yield vaults on Solana
            </div>

            <div className="relative mb-8 hidden lg:inline-flex">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-24 w-24 items-center justify-center rounded-lg glass-strong glow-red cut-corner"
              >
                <Vault className="h-11 w-11 text-white glow-text" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-lg bg-omnyie/20 border border-omnyie/30"
              >
                <ChartNoAxesCombined className="h-5 w-5 text-omnyie" />
              </motion.div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight glow-text mb-6"
            >
              OMNYIE
              <span className="block text-2xl md:text-4xl font-light text-white/45 mt-2">
                Vaults for fixed yield and leveraged upside
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-lg text-white/60 max-w-2xl mx-auto lg:mx-0 mb-4"
            >
              Package Solana yield into two clear products: a senior vault for predictable returns and a junior vault for traders who want amplified exposure to excess yield.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-white/35 max-w-xl mx-auto lg:mx-0 mb-10"
            >
              Built for USDC vault strategies, epoch-based liquidity, and private position accounting.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-4 sm:flex-row lg:items-start"
            >
              <WalletMultiButton />
              <Link href="/pools" className="inline-flex h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-white/65 transition-all hover:-translate-y-0.5 hover:border-omnyie/30 hover:text-white">
                View on-chain vaults <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-2xl"
            >
              {marketingCards.map((item, i) => {
                const Icon = item.icon;
                return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="cut-corner rounded-lg border border-white/8 bg-white/[0.045] p-4 text-left"
                >
                  <Icon className={`mb-3 h-5 w-5 ${item.tone}`} />
                  <p className="font-medium text-sm text-white/85">{item.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                </motion.div>
              )})}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18, duration: 0.7 }}
            className="relative mx-auto w-full max-w-lg"
          >
            <div className="absolute -inset-6 rounded-full bg-omnyie/10 blur-3xl" />
            <div className="cut-corner relative overflow-hidden rounded-lg border border-white/10 bg-[#101016]/85 p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/35">Live vault preview</p>
                  <h2 className="mt-1 text-xl font-bold text-white">USDC Yield Engine</h2>
                </div>
                <Badge variant="danger">Devnet</Badge>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  { label: "Senior fixed APY", value: "8.40%", icon: Landmark, color: "text-blue-300" },
                  { label: "Junior target APY", value: "~18.7%", icon: CandlestickChart, color: "text-emerald-300" },
                  { label: "Vault TVL", value: "$2.48M", icon: BadgeDollarSign, color: "text-omnyie-light" },
                ].map((metric, i) => {
                  const Icon = metric.icon;
                  return (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.08 }}
                      className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                            <Icon className={`h-4 w-4 ${metric.color}`} />
                          </div>
                          <span className="text-sm text-white/55">{metric.label}</span>
                        </div>
                        <span className="text-xl font-black text-white">{metric.value}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-5 rounded-lg border border-omnyie/20 bg-omnyie/[0.06] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-omnyie-light">
                  <Layers3 className="h-4 w-4" />
                  Vault cycle
                </div>
                <div className="mt-4 grid gap-2">
                  {vaultFlow.map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.07 }}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-white/65">{step}</span>
                      {i < vaultFlow.length - 1 ? (
                        <ChevronRight className="h-4 w-4 text-omnyie/70" />
                      ) : (
                        <Clock3 className="h-4 w-4 text-emerald-300" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight glow-text">Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">
            Split DeFi yield by risk. Fixed returns for senior, leveraged returns for junior.
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <AddTokenBanner />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-4 md:grid-cols-5"
      >
        <StatCard
          loading={loading}
          label="Total Value Locked"
          value={tvl > 0 ? `$${formatNumber(tvl)}` : "$0"}
        />
        <StatCard
          loading={loading}
          label="Total Epochs"
          value={epochCount.toString()}
        />
        <StatCard
          loading={loading}
          label="Active Epochs"
          value={activeEpochs.toString()}
        />
        <StatCard
          loading={loading}
          label="Avg Senior APY"
          value={avgSenior}
          sub="Fixed rate"
        />
        <StatCard
          loading={loading}
          label="Junior APY"
          value="Variable"
          sub="Leveraged returns"
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <section className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.025] to-omnyie/[0.05] p-5 red-scanline">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <Badge variant="danger">Vault architecture</Badge>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Two vaults, one yield source</h2>
              <p className="mt-1 max-w-2xl text-sm text-white/45">
                OMNYIE turns a single Solana yield strategy into clear risk lanes, then settles the epoch with senior priority and junior upside.
              </p>
            </div>
            <Link href="/pools">
              <Button variant="outline" size="sm">
                Browse vaults <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { num: "01", title: "Pick the vault lane", desc: "Senior targets a fixed APY. Junior accepts first-loss risk to capture the remaining yield.", icon: ShieldCheck },
              { num: "02", title: "Commit for an epoch", desc: "Deposit USDC into a 7, 14, or 30 day cycle while the vault routes capital into yield.", icon: Vault },
              { num: "03", title: "Settle by priority", desc: "At maturity, senior gets paid first and junior receives the rest of the strategy return.", icon: BadgeDollarSign },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5, rotateX: 1.5 }}
                  className="cut-corner rounded-lg bg-[#101016]/70 border border-white/[0.08] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.22)]"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-omnyie/15 border border-omnyie/30 text-omnyie">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-xs text-white/25">{step.num}</span>
                  </div>
                  <h3 className="font-medium text-white/90">{step.title}</h3>
                  <p className="mt-1 text-sm text-white/40">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Active Pools</h2>
          <Link href="/pools">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="cut-corner rounded-lg border border-white/10 bg-white/5 p-6 shimmer h-48" />
        ) : epochs.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-white/50">
              {protocolError || epochsError
                ? `Could not load on-chain vaults: ${protocolError || epochsError}`
                : "No epochs created yet. The protocol has not been initialized or has no on-chain vaults on this devnet."}
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm red-scanline">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-medium uppercase tracking-wider text-white/30">
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
              <tbody className="divide-y divide-white/5">
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
      </motion.div>
    </motion.div>
  );
}
