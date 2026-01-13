import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-zinc-200",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-zinc-900 transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

