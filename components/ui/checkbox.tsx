import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <label className="inline-flex items-center gap-2">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer h-4 w-4 rounded border border-zinc-300 bg-white text-black accent-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
          className,
        )}
        {...props}
      />
      {props.children ? (
        <span className="text-sm text-zinc-800 peer-disabled:opacity-50">
          {props.children}
        </span>
      ) : null}
    </label>
  ),
);
Checkbox.displayName = "Checkbox";

