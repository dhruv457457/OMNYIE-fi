"use client";

import { WalletProvider } from "@/providers/WalletProvider";
import { Navbar } from "@/components/layout/Navbar";
import { NetworkGuard } from "@/components/NetworkGuard";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <Navbar />
      <NetworkGuard>
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
          {children}
        </main>
      </NetworkGuard>
    </WalletProvider>
  );
}
