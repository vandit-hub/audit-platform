import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sign } from "jsonwebtoken";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const jwtSign = sign as unknown as (payload: any, secret: string, options?: any) => string;
  const token = jwtSign(
    {
      userId: (session.user as any).id,
      role: (session.user as any).role,
      email: session.user.email
    },
    secret,
    { expiresIn: process.env.WS_TOKEN_TTL || "15m" }
  );

  return NextResponse.json({ token });
}