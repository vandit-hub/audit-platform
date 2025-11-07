"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sp = useSearchParams();
  const accepted = sp.get("accepted");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard"
      });
      if (res?.error) {
        setError("Invalid email or password");
        setIsLoading(false);
      } else if (res?.ok) {
        // Redirect manually on success
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-notion-bacPri">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center px-5 py-16 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-400 bg-gray-900 text-sm font-semibold text-white">
              IA
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-gray-900">Sign in to EZAudit</h1>
              <p className="text-sm text-text-light">Use your organization email address</p>
            </div>
          </div>

          <Card variant="feature" className="space-y-6">
            {accepted && (
              <div className="rounded-300 border border-green-500/20 bg-green-100/60 px-4 py-3 text-sm text-green-500">
                Invite accepted successfully. Please log in to continue.
              </div>
            )}
            {error && (
              <div className="rounded-300 border border-pink-500/30 bg-pink-100 px-4 py-3 text-sm text-pink-500">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Card>

          <p className="text-center text-xs text-text-light">
            Secured by NextAuth • Protected access
          </p>
        </div>
      </div>
    </div>
  );
}