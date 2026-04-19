"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/* Clay デザインシステム: ホバー時に回転 + ハードシャドウ
   hover の明色背景では text-[var(--panel-text)] がダーク時に白になり潰れるので、
   明色背景の上で使う色は固定の暗色 #0a1628 を指定する。 */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#2f8fd1] text-white hover:bg-[#0f1d4a] hover:text-[#9fd8e8]",
  secondary:
    "bg-[var(--panel-bg)] text-[var(--panel-text)] border border-[var(--oat-border)] hover:bg-[#fbbd41] hover:border-[#fbbd41] hover:text-[#0a1628]",
  danger:
    "bg-[#fc7981] text-[#0a1628] hover:bg-[#e05560] hover:text-white",
  ghost:
    "bg-transparent text-[var(--panel-text)] border border-[var(--oat-border)] hover:bg-[#3bd3fd] hover:border-[#3bd3fd] hover:text-[#0a1628]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-[12.8px] font-medium tracking-[-0.128px]",
  md: "px-[12.8px] py-[6.4px] text-[16px] font-medium tracking-[-0.16px]",
  lg: "px-5 py-2.5 text-[24px] font-normal",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "btn-clay inline-flex items-center justify-center gap-2 rounded-xl",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(20,110,245)]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none",
          "select-none cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps };
