"use client";

import { signOut, useSession } from "next-auth/react";
import RoleBadge from "./RoleBadge";
import Link from "next/link";

export default function NavBar() {
  const { data: session } = useSession();
  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            Internal Audit
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/plants">Plants</Link>
            <Link href="/audits">Audits</Link>
            <Link href="/observations">Observations</Link>
            <Link href="/reports">Reports</Link>
            {session?.user?.role === "ADMIN" && (
              <Link href="/admin/users">Users</Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {session?.user && (
            <>
              <RoleBadge role={session.user.role} />
              <span className="text-sm text-gray-600">{session.user.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}