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
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/"
    });
    if ((res as any)?.error) {
      setError("Invalid email or password");
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

        <Card padding="lg">
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
            <Input
              label="Email Address"
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

          <div className="mt-6 pt-6 border-t border-neutral-200">
            <p className="text-sm text-neutral-600 text-center">
              Don't have an account?{" "}
              <span className="text-primary-600 font-medium">
                Ask an Admin to invite you
              </span>
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-neutral-500 mt-6">
          Secured by NextAuth • Protected Access
        </p>
      </div>
    </div>
  );
}