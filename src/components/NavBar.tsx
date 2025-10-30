"use client";

import { signOut, useSession } from "next-auth/react";
import RoleBadge from "./RoleBadge";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCFOOrCXOTeam, isAuditHead, isAuditee } from "@/lib/rbac";

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const userRole = session?.user?.role;

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path: string) => {
    const base = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150";
    return isActive(path)
      ? `${base} bg-primary-50 text-primary-700`
      : `${base} text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900`;
  };

  // Role-based navigation visibility
  const showPlants = userRole && isCFOOrCXOTeam(userRole);
  const showAudits = userRole && !isAuditee(userRole);
  const showObservations = true; // All roles can see observations
  const showReports = userRole && (isCFOOrCXOTeam(userRole) || isAuditHead(userRole));
  const showUsers = userRole && isCFOOrCXOTeam(userRole);
  const showAI = true; // All authenticated users can access AI Assistant

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">IA</span>
              </div>
              <span className="font-semibold text-lg text-neutral-900 hidden sm:block">
                Internal Audit
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {showPlants && (
                <Link href="/plants" className={navLinkClass("/plants")}>
                  Plants
                </Link>
              )}
              {showAudits && (
                <Link href="/audits" className={navLinkClass("/audits")}>
                  Audits
                </Link>
              )}
              {showObservations && (
                <Link href="/observations" className={navLinkClass("/observations")}>
                  Observations
                </Link>
              )}
              {showReports && (
                <Link href="/reports" className={navLinkClass("/reports")}>
                  Reports
                </Link>
              )}
              {showUsers && (
                <Link href="/admin/users" className={navLinkClass("/admin")}>
                  Users
                </Link>
              )}
              {showAI && (
                <Link href="/ai" className={navLinkClass("/ai")}>
                  AI Assistant
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {session?.user && (
              <>
                {session.user.role ? <RoleBadge role={session.user.role} /> : null}
                <span className="text-sm text-neutral-600 hidden lg:block">
                  {session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="btn-ghost text-sm"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}