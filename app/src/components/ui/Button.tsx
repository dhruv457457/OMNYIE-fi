import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-[var(--omnyie-red)] text-white hover:bg-[var(--omnyie-red-dark)] focus:ring-[var(--omnyie-red)]":
            variant === "primary",
          "bg-gray-100 text-black hover:bg-gray-200 focus:ring-gray-300":
            variant === "secondary",
          "border border-gray-200 bg-white text-black hover:bg-gray-50 focus:ring-gray-300":
            variant === "outline",
          "text-gray-600 hover:bg-gray-100 hover:text-black focus:ring-gray-300":
            variant === "ghost",
        },
        {
          "h-8 px-3 text-xs": size === "sm",
          "h-10 px-5 text-sm": size === "md",
          "h-12 px-8 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
