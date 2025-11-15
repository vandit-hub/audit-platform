"use client";

import { SidebarTrigger } from "@/components/ui/v2/sidebar";
import { Separator } from "@/components/ui/v2/separator";
import type { ReactNode } from "react";

interface AppHeaderProps {
  title?: string;
  rightSlot?: ReactNode;
}

export function AppHeader({ title, rightSlot }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-white/95"
      style={{
        borderColor: "var(--border-color-regular)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {title ? (
        <h1
          className="text-base"
          style={{
            color: "var(--c-texPri)",
            fontWeight: 600,
          }}
        >
          {title}
        </h1>
      ) : null}
      {rightSlot ? <div className="ml-auto flex items-center gap-2">{rightSlot}</div> : null}
    </header>
  );
}

