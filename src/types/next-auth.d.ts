import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "AUDITOR" | "AUDITEE" | "GUEST";
      email?: string | null;
      name?: string | null;
    } & DefaultSession["user"];
    lastActivity?: number;
  }

  interface User {
    id: string;
    role: "ADMIN" | "AUDITOR" | "AUDITEE" | "GUEST";
    status?: "ACTIVE" | "INVITED" | "DISABLED";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "ADMIN" | "AUDITOR" | "AUDITEE" | "GUEST";
    lastActivity?: number;
    expired?: boolean;
    status?: "ACTIVE" | "INVITED" | "DISABLED";
  }
}