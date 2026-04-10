"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/pools", label: "Pools" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/epochs", label: "Epochs" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/LOGO.PNG"
            alt="OMNYIE"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="text-lg font-bold tracking-tight text-[var(--omnyie-red)]">
            OMNYIE Finance
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-[var(--omnyie-red-50)] text-[var(--omnyie-red)]"
                  : "text-gray-500 hover:bg-gray-50 hover:text-black"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[var(--omnyie-red-50)] px-3 py-1 text-xs font-medium text-[var(--omnyie-red)]">
            Devnet
          </div>
          {mounted ? (
            <WalletMultiButton className="!bg-[#C62828] !text-white !rounded-lg !h-10 !text-sm !font-medium hover:!bg-[#8E0000] !transition-colors" />
          ) : (
            <div className="h-10 w-[166px] animate-pulse rounded-lg bg-gray-200" />
          )}
        </div>
      </div>
    </nav>
  );
}
