"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

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
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Accept Invitation</h1>
          <p className="text-neutral-600">Complete your account setup to get started</p>
        </div>

        <Card className="p-6">
          {error && (
            <div className="mb-6 text-sm text-error-700 bg-error-50 border border-error-200 p-4 rounded-lg flex items-start gap-3">
              <svg className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="token">Invite Token</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                placeholder="Paste your invitation token"
              />
              <p className="text-xs text-muted-foreground">Enter the token you received from the Admin</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">Use at least 8 characters with letters, numbers & symbols</p>
            </div>

            <Button
              type="submit"
              variant="default"
              disabled={busy}
              className="w-full"
            >
              {busy ? "Setting up your account..." : "Accept Invitation"}
            </Button>
          </form>
        </Card>

        <p className="text-center mt-6 text-sm text-neutral-600">
          Already have an account?{" "}
          <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}