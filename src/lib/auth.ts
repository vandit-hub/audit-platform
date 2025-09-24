import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { writeAuditEvent } from "@/server/auditTrail";
import type { AdapterUser } from "next-auth/adapters";
import type { Session, User } from "next-auth";
import { Role, type UserStatus } from "@prisma/client";

const ABSOLUTE_HOURS = parseInt(process.env.ABSOLUTE_SESSION_HOURS || "24", 10);
const IDLE_MIN = parseInt(process.env.IDLE_TIMEOUT_MINUTES || "15", 10);

type SessionRole = Session["user"] extends { role: infer R } ? R : Role;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
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
        const rawEmail = typeof credentials?.email === "string" ? credentials.email : "";
        const email = rawEmail.toLowerCase().trim();
        const password = typeof credentials?.password === "string" ? credentials.password : "";

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

      if (user && hasRoleMetadata(user)) {
        token.userId = user.id;
        token.role = user.role;
        token.status = user.status ?? undefined;
        token.lastActivity = now;
      } else {
        const last = typeof token.lastActivity === "number" ? token.lastActivity : now;
        if (now - last > idleMs) {
          token.expired = true;
        } else {
          token.lastActivity = now;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.expired) {
        session.expired = true;
        Reflect.deleteProperty(session, "user");
        session.lastActivity = typeof token.lastActivity === "number" ? token.lastActivity : undefined;
        return session;
      }
      const userId = typeof token.userId === "string" ? token.userId : undefined;
      if (userId) {
        const prevUser = session.user;
        const role = (token.role ?? prevUser?.role ?? Role.GUEST) as SessionRole;
        const nextUser = prevUser
          ? { ...prevUser, id: userId, role }
          : {
              id: userId,
              role,
              email: "",
              emailVerified: null
            };
        session.user = nextUser;
      }
      session.lastActivity = typeof token.lastActivity === "number" ? token.lastActivity : undefined;
      return session;
    }
  }
});

type UserWithRole = (User | AdapterUser) & {
  role: Role;
  status?: UserStatus | null;
};

function hasRoleMetadata(user: User | AdapterUser): user is UserWithRole {
  return (
    typeof user.id === "string" &&
    "role" in user &&
    typeof (user as { role?: unknown }).role === "string" &&
    (Object.values(Role) as string[]).includes((user as { role: string }).role)
  );
}
