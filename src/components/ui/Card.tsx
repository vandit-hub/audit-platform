"use client";

import { HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "stat" | "feature";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", padding, hover = false, className = "", children, ...props }, ref) => {
    const baseVariants: Record<CardProps["variant"], string> = {
      default: "bg-white border border-border-regular rounded-500",
      stat: "bg-gray-200 rounded-700 text-center",
      feature: "bg-white border border-border-regular rounded-700",
    };

    const paddings: Record<Exclude<CardProps["padding"], undefined>, string> = {
      none: "",
      sm: "p-6",
      md: "p-8",
      lg: "p-12",
    };

    const defaultPaddingByVariant: Record<CardProps["variant"], Exclude<CardProps["padding"], undefined>> = {
      default: "md",
      stat: "lg",
      feature: "md",
    };

    const resolvedPaddingKey = padding ?? defaultPaddingByVariant[variant];

    const hoverStyles = hover ? "transition-all duration-200 hover:-translate-y-[1px]" : "";

    return (
      <div
        ref={ref}
        className={`${baseVariants[variant]} ${paddings[resolvedPaddingKey]} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
