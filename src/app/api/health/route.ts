import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null
  });
}