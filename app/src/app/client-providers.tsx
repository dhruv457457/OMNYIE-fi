"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { WalletProvider } from "@/providers/WalletProvider";
import { Navbar } from "@/components/layout/Navbar";
import { NetworkGuard } from "@/components/NetworkGuard";
import { ParticleBackground } from "@/components/ParticleBackground";

function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <ParticleBackground />
      <Navbar />
      <NetworkGuard>
        <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </NetworkGuard>
    </WalletProvider>
  );
}
