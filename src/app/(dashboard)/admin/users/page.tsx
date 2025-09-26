"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"GUEST" | "AUDITEE" | "AUDITOR" | "ADMIN">("GUEST");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  if (session?.user?.role !== "ADMIN") {
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">Invite new users to the audit platform</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Invite New User</h2>

        <form onSubmit={handleInviteUser} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="GUEST">Guest</option>
              <option value="AUDITEE">Auditee</option>
              <option value="AUDITOR">Auditor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label htmlFor="expires" className="block text-sm font-medium text-gray-700 mb-1">
              Expires In (Days)
            </label>
            <input
              type="number"
              id="expires"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
              min="1"
              max="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Invitation..." : "Send Invitation"}
          </button>
        </form>


        {inviteToken && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Invitation Created</h3>
            <p className="text-sm text-blue-700 mb-3">
              Share this invitation link with the user:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/accept-invite?token=${inviteToken}`}
                className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded-md"
              />
              <button
                onClick={copyInviteLink}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}