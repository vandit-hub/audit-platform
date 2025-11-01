"use client";

import { useState } from "react";
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
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">User Management</h1>
        <p className="text-base text-neutral-600 mt-2">Invite new users to the audit platform</p>
      </div>

      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Invite New User</h2>

        <form onSubmit={handleInviteUser} className="space-y-6">
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
            className="w-full"
          >
            {isLoading ? "Creating Invitation..." : "Send Invitation"}
          </Button>
        </form>

        {inviteToken && (
          <div className="mt-6 p-5 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-start gap-3 mb-4">
              <svg className="h-6 w-6 text-primary-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-primary-900 mb-1">Invitation Created Successfully</h3>
                <p className="text-sm text-primary-700">
                  Share this invitation link with the user:
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/accept-invite?token=${inviteToken}`}
                className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-primary-300 rounded-lg focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none"
              />
              <Button
                onClick={copyInviteLink}
                variant="primary"
                size="md"
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}