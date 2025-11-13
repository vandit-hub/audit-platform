"use client";

import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/v2/card";
import { cn } from "@/lib/utils";

type LegacyCardPadding = "sm" | "md" | "lg";

const paddingMap: Record<LegacyCardPadding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

interface LegacyCardProps {
  children: ReactNode;
  padding?: LegacyCardPadding;
  className?: string;
}

export function LegacyCard({
  children,
  padding = "lg",
  className,
}: LegacyCardProps) {
  return (
    <Card className={className}>
      <CardContent className={cn(paddingMap[padding])}>{children}</CardContent>
    </Card>
  );
}

