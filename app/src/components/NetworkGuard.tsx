"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { NETWORK } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const { connection } = useConnection();
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!connected) {
      setChecking(false);
      return;
    }
    const check = async () => {
      try {
        const genesis = await connection.getGenesisHash();
        const isMainnet = genesis === "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
        if (NETWORK === "mainnet-beta" && !isMainnet) setWrongNetwork(true);
        else if (NETWORK === "devnet" && isMainnet) setWrongNetwork(true);
        else setWrongNetwork(false);
      } catch {
        setWrongNetwork(false);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, [connected, connection]);

  if (checking) return <>{children}</>;

  if (wrongNetwork) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
          <svg className="h-10 w-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Wrong Network</h2>
        <p className="text-white/50 max-w-md mb-6 text-sm">
          Please switch your wallet to <strong className="text-white">{NETWORK}</strong> to use this app.
        </p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
