"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/v2/input";
import { Button } from "@/components/ui/v2/button";
import { Card } from "@/components/ui/v2/card";
import { Label } from "@/components/ui/v2/label";

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
    } catch (error) {
      console.error("Login failed", error);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-primary-50 via-neutral-50 to-neutral-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-primary-600 rounded-xl mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">IA</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">Internal Audit Platform</h1>
          <p className="text-neutral-600 mt-2">Sign in to your account</p>
        </div>

        <Card className="p-6">
          {accepted && (
            <div className="mb-4 text-sm text-success-700 bg-success-50 border border-success-200 p-3 rounded-md">
              ✓ Invite accepted successfully. Please log in to continue.
            </div>
          )}
          {error && (
            <div className="mb-4 text-sm text-error-700 bg-error-50 border border-error-200 p-3 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-neutral-500 mt-6">
          Secured by NextAuth • Protected Access
        </p>
      </div>
    </div>
  );
}