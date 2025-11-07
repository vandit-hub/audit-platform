"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function AcceptInvitePage() {
  const sp = useSearchParams();
  const tokenParam = sp.get("token") || "";
  const [token, setToken] = useState(tokenParam);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/accept-invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, password })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      router.push("/login?accepted=1");
    } catch (err: any) {
      setError(err.message || "Failed to accept invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-notion-bacPri">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center px-5 py-16 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-400 bg-gray-900 text-sm font-semibold text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5h16M4 5v11a2 2 0 002 2h12a2 2 0 002-2V5M10 9h4" />
              </svg>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-gray-900">Accept invitation</h1>
              <p className="text-sm text-text-light">Confirm your details to finish setting up your access</p>
            </div>
          </div>

          <Card variant="feature" className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-300 border border-pink-500/30 bg-pink-100 px-4 py-3 text-sm text-pink-500">
                <svg className="mt-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-11a.75.75 0 01.743.648L10.75 7v4a.75.75 0 01-1.493.102L9.25 11V7a.75.75 0 01.75-.75zm0 8a1 1 0 110 2 1 1 0 010-2z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                label="Invite token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                placeholder="Paste your invitation token"
                helperText="This token was emailed to you by the audit team"
              />

              <Input
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Jane Doe"
              />

              <Input
                type="password"
                label="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                helperText="Use at least 8 characters with letters, numbers, and symbols"
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={busy}
                className="w-full"
              >
                {busy ? "Setting up your account..." : "Accept invitation"}
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-text-light">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}