import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import jwt from "jsonwebtoken";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = jwt.sign(
    {
      userId: (session.user as any).id,
      role: (session.user as any).role,
      email: session.user.email
    },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: '24h' }
  );

  return NextResponse.json({ token });
}