import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
  trackClassName?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value = 0,
      max = 100,
      className,
      indicatorClassName,
      trackClassName,
      ...props
    },
    ref
  ) => {
    const clampedValue = Number.isFinite(value)
      ? Math.min(Math.max(value, 0), max)
      : 0;
    const percent = max > 0 ? (clampedValue / max) * 100 : 0;

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-[var(--border-color-regular)]/60",
          trackClassName,
          className
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(percent)}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full rounded-full bg-[var(--c-palUiBlu600)] transition-all duration-500 ease-out",
            indicatorClassName
          )}
          style={{ transform: `translateX(-${100 - percent}%)` }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";


