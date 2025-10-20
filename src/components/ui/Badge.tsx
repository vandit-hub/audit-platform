import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "success" | "error" | "warning" | "neutral";
  size?: "sm" | "md";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "neutral", size = "md", className = "", children, ...props }, ref) => {
    // S-Tier: Add smooth transitions for dynamic badge changes + consistent width
    const baseStyles = "inline-flex items-center justify-center font-semibold rounded-md transition-colors duration-200 ease-out min-w-[44px]";

    // S-Tier: Enhanced color combinations with better contrast
    const variants = {
      primary: "bg-primary-100 text-primary-800 border border-primary-200",
      success: "bg-success-100 text-success-800 border border-success-200",
      error: "bg-error-100 text-error-800 border border-error-200",
      warning: "bg-warning-100 text-warning-800 border border-warning-200",
      neutral: "bg-neutral-100 text-neutral-700 border border-neutral-200",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-xs",
    };

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
