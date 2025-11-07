"use client";

import { HTMLAttributes, forwardRef } from "react";

export type StatusBadgeVariant =
  | "done"
  | "inProgress"
  | "notStarted"
  | "blocked"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "neutral";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
}

const variantStyles: Record<StatusBadgeVariant, string> = {
  done: "bg-green-100 text-green-500",
  inProgress: "bg-blue-100 text-blue-700",
  notStarted: "bg-notion-bacSec text-notion-texSec",
  blocked: "bg-pink-100 text-pink-500",
  primary: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-500",
  warning: "bg-pink-100 text-pink-500",
  error: "bg-pink-100 text-pink-500",
  neutral: "bg-notion-bacSec text-notion-texSec",
};

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ variant = "notStarted", className = "", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2 py-1 rounded-300 text-[13px] font-medium whitespace-nowrap ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

export default StatusBadge;

