"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardContent from "@/components/DashboardContent";

export default function HomeClient() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center p-8">
        <div className="text-center text-neutral-600">Loading…</div>
      </div>
    );
  }

  return <DashboardContent />;
}


