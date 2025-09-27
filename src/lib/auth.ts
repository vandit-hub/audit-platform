import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { writeAuditEvent } from "@/server/auditTrail";

const ABSOLUTE_HOURS = parseInt(process.env.ABSOLUTE_SESSION_HOURS || "24", 10);
const IDLE_MIN = parseInt(process.env.IDLE_TIMEOUT_MINUTES || "15", 10);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: ABSOLUTE_HOURS * 60 * 60 // absolute session lifetime
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.toLowerCase().trim();
        const password = (credentials?.password as string) || "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.status !== "ACTIVE") return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        await writeAuditEvent({
          entityType: "USER",
          entityId: user.id,
          action: "LOGIN",
          actorId: user.id
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "",
          role: user.role,
          status: user.status
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Date.now();
      const idleMs = IDLE_MIN * 60 * 1000;

      if (user) {
        token.userId = (user as any).id;
        token.role = (user as any).role;
        token.status = (user as any).status;
        token.lastActivity = now;
      } else {
        const last = (token.lastActivity as number) ?? now;
        if (now - last > idleMs) {
          token.expired = true;
        } else {
          token.lastActivity = now;
        }
      }

      return token;
    },
    async session({ session, token }): Promise<any> {
      if (token.expired) {
        // returning null triggers no session on server components
        // Client will get redirected by protected layout
        return null;
      }
      if (session.user) {
        (session.user as any).id = token.userId!;
        (session.user as any).role = token.role!;
        (session as any).lastActivity = token.lastActivity;
      }
      return session;
    }
  }
});