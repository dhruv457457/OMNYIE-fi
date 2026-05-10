"use client";

import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function ConnectWalletPrompt({ minimal = false }: { minimal?: boolean }) {
  const { connected } = useWallet();

  if (connected) return null;

  if (minimal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10">
            <svg className="h-10 w-10 text-omnyie" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
        <p className="text-white/50 max-w-md mb-6 text-sm">
          Connect your Solana wallet to view positions, deposit into pools, and manage your yield.
        </p>
        <WalletMultiButton />
      </motion.div>
    );
  }

  return (
    <section className="relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center text-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <div className="absolute -inset-20 bg-gradient-radial from-omnyie/10 via-transparent to-transparent rounded-full blur-3xl" />

        <div className="relative mb-8 inline-flex">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 border border-white/10 glow-red">
            <svg className="h-12 w-12 text-omnyie" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-bold tracking-tight glow-text mb-4"
        >
          Connect Your Wallet
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-lg text-white/50 max-w-xl mx-auto mb-8"
        >
          Connect your Solana wallet to access yield tranching, deposit into pools, manage positions, and withdraw your earnings.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <WalletMultiButton />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto"
        >
          {[
            { label: "Deposit USDC", desc: "into senior or junior tranches" },
            { label: "Earn Yield", desc: "fixed or leveraged returns" },
            { label: "Withdraw Anytime", desc: "with encrypted privacy" },
          ].map((item) => (
            <div key={item.label} className="glass rounded-xl p-4">
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
