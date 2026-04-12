"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/* Clay デザインシステム: ホバー時に回転 + ハードシャドウ */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#078a52] text-white hover:bg-[#02492a] hover:text-[#84e7a5]",
  secondary:
    "bg-white text-black border border-[#dad4c8] hover:bg-[#fbbd41] hover:border-[#fbbd41] hover:text-black",
  danger:
    "bg-[#fc7981] text-black hover:bg-[#e05560] hover:text-white",
  ghost:
    "bg-transparent text-black border border-[#dad4c8] hover:bg-[#3bd3fd] hover:border-[#3bd3fd] hover:text-black",
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
