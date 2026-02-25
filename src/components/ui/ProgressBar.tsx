"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
  "aria-label"?: string;
}

/**
 * Progress bar that sets width imperatively via ref to avoid inline style lint warnings.
 */
export default function ProgressBar({
  value,
  className,
  barClassName,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = `${Math.min(Math.max(value, 0), 100)}%`;
    }
  }, [value]);

  return (
    <div className={cn("h-2 bg-surface-tertiary rounded-full overflow-hidden", className)}>
      <div
        ref={barRef}
        role="progressbar"
        aria-label={ariaLabel}
        className={cn("h-full rounded-full transition-all", barClassName)}
      />
    </div>
  );
}
