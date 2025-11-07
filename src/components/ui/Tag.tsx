"use client";

import { HTMLAttributes, forwardRef } from "react";

export type TagVariant = "blue" | "green" | "purple" | "pink";

const variantStyles: Record<TagVariant, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-500",
  purple: "bg-purple-100 text-purple-500",
  pink: "bg-pink-100 text-pink-500",
};

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
}

const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ variant = "blue", className = "", children, ...props }, ref) => (
    <span
      ref={ref}
      className={`notion-tag ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
);

Tag.displayName = "Tag";

export default Tag;

