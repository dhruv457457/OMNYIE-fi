"use client";

import { useState } from "react";
import { USDC_MINT } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

const TOKENS = [
  {
    label: "Test USDC",
    address: USDC_MINT.toBase58(),
    description: "Devnet USDC for testing deposits",
  },
  {
    label: "srUSDC (Senior Tranche)",
    address: "Etc1f9WRhLVzT6t8XEWwTebEmw58AGE31nNW7xxnHPaH",
    description: "Token-2022 — minted when you deposit into Senior tranche",
  },
  {
    label: "jrUSDC (Junior Tranche)",
    address: "8uFbF7mp2TGxwwtW4Ez75MLzoNVBvJ65xEvbuaxU6Lb9",
    description: "Token-2022 — minted when you deposit into Junior tranche",
  },
];

function TokenRow({ label, address, description }: (typeof TOKENS)[0]) {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--omnyie-red)]">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <code className="rounded bg-white px-2 py-1 text-xs text-gray-700 border border-gray-200 max-w-[180px] truncate">
          {address}
        </code>
        <Button size="sm" variant="outline" onClick={copyAddress}>
          {copied ? "Copied!" : "Copy"}
        </Button>
        <a
          href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="ghost">
            Explorer
          </Button>
        </a>
      </div>
    </div>
  );
}

export function AddTokenBanner() {
  return (
    <div className="rounded-2xl border border-[var(--omnyie-red-100)] bg-[var(--omnyie-red-50)] p-4">
      <div className="divide-y divide-[var(--omnyie-red-100)]">
        {TOKENS.map((token) => (
          <TokenRow key={token.address} {...token} />
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-white/70 p-3">
        <p className="text-xs font-medium text-gray-700 mb-1">
          How to import tokens in your wallet:
        </p>
        <ol className="list-decimal list-inside text-xs text-gray-600 space-y-0.5">
          <li>Open <strong>Phantom</strong> or <strong>Solflare</strong></li>
          <li>Make sure you&apos;re on <strong>Solana Devnet</strong> (Settings &rarr; Developer Settings &rarr; Devnet)</li>
          <li>Click &quot;Import Token&quot; or &quot;Add Token&quot;</li>
          <li>Paste the token mint address and confirm</li>
        </ol>
        <p className="text-xs text-gray-500 mt-2">
          <strong>Note:</strong> srUSDC and jrUSDC are <strong>Token-2022</strong> tokens.
          If Phantom doesn&apos;t find them, check your balance on{" "}
          <a
            href="https://explorer.solana.com/?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--omnyie-red)] underline"
          >
            Solana Explorer
          </a>.
        </p>
      </div>
    </div>
  );
}
