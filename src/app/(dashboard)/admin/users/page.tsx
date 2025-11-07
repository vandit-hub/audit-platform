"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { isCFOOrCXOTeam, isCFO } from "@/lib/rbac";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"GUEST" | "AUDITEE" | "AUDITOR" | "CXO_TEAM" | "AUDIT_HEAD">("GUEST");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  if (!session?.user?.role || !isCFOOrCXOTeam(session.user.role)) {
    redirect("/");
  }

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined" || !inviteToken) return "";
    return `${window.location.origin}/accept-invite?token=${inviteToken}`;
  }, [inviteToken]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setInviteToken(null);

    try {
      const response = await fetch("/api/v1/auth/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role,
          expiresInDays,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteToken(data.token);
        setEmail("");
        setRole("GUEST");
        setExpiresInDays(7);
        showSuccess(`Invitation created successfully for ${email}!`);
      } else {
        const errorMessage = data.message || "Failed to create invitation";
          showError(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred while creating the invitation";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (inviteToken) {
      const inviteUrl = `${window.location.origin}/accept-invite?token=${inviteToken}`;

      try {
        // Try using the modern clipboard API (requires HTTPS)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(inviteUrl);
          showSuccess("Invite link copied to clipboard!");
        } else {
          // Fallback for HTTP - create a temporary textarea
          const textarea = document.createElement('textarea');
          textarea.value = inviteUrl;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          showSuccess("Invite link copied to clipboard!");
        }
      } catch (err) {
        console.error('Failed to copy:', err);
        showError("Failed to copy to clipboard. Please copy manually.");
      }
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">User management</h1>
        <p className="text-sm text-text-light">Send role-based invitations to the audit platform.</p>
      </div>

      <Card variant="feature" className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Invite new user</h2>
          <p className="text-sm text-text-light">Choose the role, expiry, and send a secure invite link.</p>
        </div>

        <form onSubmit={handleInviteUser} className="space-y-4">
          <Input
            type="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
          />

          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="GUEST">Guest</option>
            <option value="AUDITEE">Auditee</option>
            <option value="AUDITOR">Auditor</option>
            {isCFO(session?.user?.role) && (
              <>
                <option value="CXO_TEAM">CXO Team</option>
                <option value="AUDIT_HEAD">Audit Head</option>
              </>
            )}
          </Select>

          <Input
            type="number"
            label="Expires In (Days)"
            value={expiresInDays.toString()}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
            min="1"
            max="30"
            helperText="Invitation will expire after this many days (1-30)"
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            {isLoading ? "Creating Invitation..." : "Send Invitation"}
          </Button>
        </form>

        {inviteToken && (
          <div className="rounded-400 border border-blue-500/20 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-2">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-900">Invitation created</h3>
                  <p className="text-sm text-text-light">Share this link with the user to complete their setup.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 rounded-400 border border-notion-borPri bg-white px-3.5 py-2 text-sm text-notion-texPri focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                  <Button onClick={copyInviteLink} variant="primary">
                    Copy link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}