"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const TOKENS = [
  { symbol: "USDC", name: "Test USDC", mint: "8a6jsDxNAm51EL1DBZbVwt96VLKnVZWd8ama6TDsMoEk" },
  { symbol: "srUSDC", name: "Senior Tranche USDC", mint: "5R1s6zARQa28Krj6qFJjVKBfS4LCfBxPCBE6X1ysnNQV" },
  { symbol: "jrUSDC", name: "Junior Tranche USDC", mint: "HwB1kFKMgnWpUozVgBGntjWjCh8fDWCjt6zMFEePaBCk" },
];

export function AddTokenBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copy = async (mint: string, idx: number) => {
    await navigator.clipboard.writeText(mint);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="glass rounded-2xl p-5 border border-omnyie/20"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-omnyie/20">
                  <svg className="w-3 h-3 text-omnyie" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white/80">Devnet Tokens</span>
              </div>
              <p className="text-xs text-white/40">
                Add these test tokens to your wallet for the demo experience:
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {TOKENS.map((t, i) => (
              <button
                key={t.symbol}
                onClick={() => copy(t.mint, i)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all",
                  copiedIdx === i
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white/80",
                )}
              >
                <span className="font-medium">{t.symbol}</span>
                <span className="text-white/30">{t.mint.slice(0, 4)}...{t.mint.slice(-4)}</span>
                {copiedIdx === i ? (
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
