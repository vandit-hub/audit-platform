import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  // Simply returning a response is enough; the JWT callback updates lastActivity.
  return NextResponse.json({ ok: true, ts: Date.now() });
}


