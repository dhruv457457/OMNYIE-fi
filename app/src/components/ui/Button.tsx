"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = "primary", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex items-center justify-center overflow-hidden rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-omnyie/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 select-none",
          {
            "bg-gradient-to-r from-omnyie via-[#f31833] to-omnyie-dark text-white shadow-lg shadow-omnyie/20 hover:shadow-omnyie/35 hover:-translate-y-0.5 active:translate-y-0 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full":
              variant === "primary",
            "bg-white/10 text-white hover:bg-white/15 border border-white/10 hover:border-white/20":
              variant === "secondary",
            "border border-white/20 bg-transparent text-white/80 hover:bg-white/5 hover:text-white hover:border-omnyie/40":
              variant === "outline",
            "text-white/50 hover:bg-white/5 hover:text-white":
              variant === "ghost",
          },
          {
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-5 text-sm": size === "md",
            "h-12 px-8 text-base": size === "lg",
          },
          className,
        )}
        {...props}
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {children}
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";
