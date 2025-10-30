"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";

export default function SessionTimeout() {
  const { data: session } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const lastActivityLocalRef = useRef<number | null>(null);
  const tickingRef = useRef<NodeJS.Timeout | null>(null);

  const idleTimeoutMs = useMemo(() => {
    const s = (session as any)?.idleTimeoutMs as number | undefined;
    return typeof s === "number" && s > 0 ? s : 15 * 60 * 1000; // fallback 15m
  }, [session]);

  // Compute remaining time based on last activity (server value or local updated)
  const computeRemainingMs = (): number => {
    const base = lastActivityLocalRef.current ?? ((session as any)?.lastActivity as number | undefined) ?? Date.now();
    return base + idleTimeoutMs - Date.now();
  };

  const startTicking = () => {
    if (tickingRef.current) return;
    tickingRef.current = setInterval(() => {
      const rem = computeRemainingMs();
      setSecondsLeft(Math.max(0, Math.floor(rem / 1000)));
      if (rem <= 0) {
        clearInterval(tickingRef.current as NodeJS.Timeout);
        tickingRef.current = null;
        // Session considered expired on client — perform sign out to redirect
        signOut({ callbackUrl: "/login?expired=1" });
      } else if (rem <= 60 * 1000) {
        setShowWarning(true);
      }
    }, 1000);
  };

  useEffect(() => {
    if (!session?.user) {
      setShowWarning(false);
      if (tickingRef.current) {
        clearInterval(tickingRef.current);
        tickingRef.current = null;
      }
      return;
    }
    startTicking();
    return () => {
      if (tickingRef.current) {
        clearInterval(tickingRef.current);
        tickingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  const continueSession = async () => {
    try {
      const res = await fetch("/api/v1/auth/ping", { cache: "no-store" });
      if (res.ok) {
        lastActivityLocalRef.current = Date.now();
        setShowWarning(false);
      } else {
        // Server already considers session invalid — sign out
        signOut({ callbackUrl: "/login?expired=1" });
      }
    } catch {
      signOut({ callbackUrl: "/login?expired=1" });
    }
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg border border-neutral-200 w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-neutral-900">Session expiring soon</h3>
        <p className="text-sm text-neutral-700 mt-2">
          Your session will end in <span className="font-semibold">{secondsLeft}</span> seconds due to inactivity.
        </p>
        <div className="mt-5 flex items-center gap-3 justify-end">
          <button
            className="px-4 py-2 text-sm font-medium rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
            onClick={() => signOut({ callbackUrl: "/login?expired=1" })}
          >
            Sign out now
          </button>
          <button
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700"
            onClick={continueSession}
          >
            Continue session
          </button>
        </div>
      </div>
    </div>
  );
}


