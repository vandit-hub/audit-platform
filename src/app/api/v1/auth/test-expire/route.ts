import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * TEST ENDPOINT - Simulates session expiry by setting lastActivity to a past time.
 * Only available in development.
 * 
 * Usage: GET /api/v1/auth/test-expire?seconds=<number>
 * 
 * Example: /api/v1/auth/test-expire?seconds=840 (14 minutes ago)
 * This will make the session appear like it's been idle for 14 minutes.
 * Then wait 60 seconds and you'll see the warning modal.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const secondsAgo = parseInt(url.searchParams.get("seconds") || "840", 10); // default 14min

  return NextResponse.json({
    ok: true,
    message: `Session lastActivity will appear as ${secondsAgo} seconds ago on next request`,
    note: "This is a client-side simulation. Refresh the page or navigate to trigger the warning.",
    instructions: [
      "1. Open browser DevTools Console",
      "2. Run: document.cookie = document.cookie.replace(/next-auth.session-token=[^;]+/, 'next-auth.session-token=EXPIRED')",
      "3. Or just wait and the SessionTimeout component will check every second",
      "Alternative: Use the helper below"
    ],
    helper: `
// Paste this in your browser console to force idle expiry test:
(async () => {
  const now = Date.now();
  const idleMs = 15 * 60 * 1000; // 15 min
  const targetMs = ${secondsAgo * 1000}; // seconds ago
  console.log('Simulating session idle for', targetMs / 1000, 'seconds');
  console.log('Warning should appear when <60s remain');
  console.log('That will be in:', Math.max(0, (idleMs - targetMs) / 1000 - 60), 'seconds from now');
})();
`
  });
}

