"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { NETWORK } from "@/lib/constants";

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const [chainMatch, setChainMatch] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const genesisHash = await connection.getGenesisHash();
        // Solana devnet genesis hash
        const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
        const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

        const expectedGenesis =
          NETWORK === "devnet" ? DEVNET_GENESIS : MAINNET_GENESIS;
        setChainMatch(genesisHash === expectedGenesis);
      } catch {
        setChainMatch(null);
      }
    }
    check();
  }, [connection]);

  if (chainMatch === false) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-[var(--omnyie-red-100)] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--omnyie-red-50)]">
            <svg
              className="h-8 w-8 text-[var(--omnyie-red)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Wrong Network</h2>
          <p className="mt-2 text-gray-500">
            OMNYIE Finance is running on Solana <strong className="text-[var(--omnyie-red)]">{NETWORK}</strong>.
            Please switch your wallet to {NETWORK} to continue.
          </p>
          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left text-sm text-gray-600">
            <p className="font-medium mb-2">How to switch:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open your wallet (Phantom/Solflare)</li>
              <li>Go to Settings &rarr; Developer Settings</li>
              <li>Change network to <strong>{NETWORK}</strong></li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
