import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        {
          "border-white/10 bg-white/5 text-white/60": variant === "default",
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400": variant === "success",
          "border-amber-500/20 bg-amber-500/10 text-amber-400": variant === "warning",
          "border-red-500/20 bg-red-500/10 text-red-400": variant === "danger",
          "border-blue-500/20 bg-blue-500/10 text-blue-400": variant === "info",
        },
        className,
      )}
    >
      {children}
    </span>
  );
}
