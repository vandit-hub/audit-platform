import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      email?: string | null;
      name?: string | null;
    } & DefaultSession["user"];
    lastActivity?: number;
  }

  interface User {
    id: string;
    role: Role;
    status?: "ACTIVE" | "INVITED" | "DISABLED";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
    lastActivity?: number;
    expired?: boolean;
    status?: "ACTIVE" | "INVITED" | "DISABLED";
  }
}
