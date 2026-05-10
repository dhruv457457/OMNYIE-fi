"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hoverable, onClick }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      whileHover={hoverable ? { y: -2, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={cn(
        "cut-corner rounded-lg border border-white/10 bg-white/[0.055] p-6 backdrop-blur-md transition-all duration-300 shadow-[0_18px_60px_rgba(0,0,0,0.24)]",
        hoverable && "hover:border-omnyie/30 hover:bg-white/[0.075] cursor-pointer",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  trend,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down";
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="cut-corner rounded-lg border border-white/10 bg-white/5 p-6 shimmer" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="cut-corner group rounded-lg border border-white/10 bg-white/[0.055] p-5 backdrop-blur-md hover:border-omnyie/30 transition-all duration-300 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
    >
      <div className="mb-4 h-1 w-9 rounded-full bg-gradient-to-r from-omnyie to-transparent opacity-70 transition-all duration-300 group-hover:w-14 group-hover:opacity-100" />
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight glow-text">{value}</p>
      {sub && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-red-400",
            !trend && "text-white/30",
          )}
        >
          {sub}
        </p>
      )}
    </motion.div>
  );
}
