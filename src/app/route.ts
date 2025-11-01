import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const originalUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || originalUrl.host;
  const proto = forwardedProto || originalUrl.protocol.replace(":", "");

  const origin = `${proto}://${host}`;
  const redirectUrl = new URL("/dashboard", origin);
  return NextResponse.redirect(redirectUrl, 307);
}


