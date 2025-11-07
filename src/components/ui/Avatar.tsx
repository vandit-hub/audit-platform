"use client";

import { HTMLAttributes, forwardRef } from "react";

type AvatarTone = "blue" | "green" | "purple" | "pink" | "gray";

const toneMap: Record<AvatarTone, string> = {
  blue: "bg-blue-600",
  green: "bg-green-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  gray: "bg-gray-700",
};

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
  initials?: string;
  tone?: AvatarTone;
}

const getInitials = (name?: string, override?: string) => {
  if (override) return override.slice(0, 2).toUpperCase();
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, initials, tone = "blue", className = "", children, ...props }, ref) => {
    const resolvedInitials = getInitials(name, initials);

    return (
      <div
        ref={ref}
        className={`notion-avatar ${toneMap[tone]} ${className}`}
        aria-label={name}
        {...props}
      >
        {children ?? resolvedInitials}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export default Avatar;

