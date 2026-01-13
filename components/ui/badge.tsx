import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "success" | "warning";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
      default: "bg-black text-white",
      outline: "border border-zinc-200 text-zinc-800",
      success: "bg-emerald-100 text-emerald-900",
      warning: "bg-amber-100 text-amber-900",
    };
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
          variants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";

