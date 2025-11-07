"use client";

import { signOut, useSession } from "next-auth/react";
import RoleBadge from "./RoleBadge";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCFOOrCXOTeam, isAuditHead, isAuditee, isCFO, isGuest } from "@/lib/rbac";
import Button from "@/components/ui/Button";

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
    const base = "inline-flex items-center px-3 py-2 rounded-300 text-sm font-medium transition-colors duration-200";
    return isActive(path)
      ? `${base} bg-gray-900 text-white`
      : `${base} text-notion-texSec hover:bg-notion-bacHov hover:text-gray-900`;
  };

  // Role-based navigation visibility
  const showPlants = userRole && isCFOOrCXOTeam(userRole);
  const showAudits = userRole && !isAuditee(userRole);
  const showObservations = true; // All roles can see observations
  const showReports = userRole && (isCFOOrCXOTeam(userRole) || isAuditHead(userRole));
  const showUsers = userRole && isCFOOrCXOTeam(userRole);
  const showImport = userRole && isCFO(userRole); // CFO-only import feature
  const showAI = userRole && !isAuditee(userRole) && !isGuest(userRole);

  return (
    <header className="sticky top-0 z-50 border-b border-border-regular bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-400 bg-gray-900 text-sm font-semibold text-white">
              IA
            </div>
            <span className="hidden text-lg font-semibold text-gray-900 sm:block">
              Internal Audit
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
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
                <Link href="/admin/users" className={navLinkClass("/admin/users")}>
                  Users
                </Link>
              )}
              {showImport && (
                <Link href="/admin/import" className={navLinkClass("/admin/import")}>
                  Import
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
                <span className="hidden text-sm text-text-light lg:block">
                  {session.user.email}
                </span>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  Sign out
                </Button>
              </>
            )}
          </div>
        </div>
    </header>
  );
}