"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sp = useSearchParams();
  const accepted = sp.get("accepted");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/"
    });
    if ((res as any)?.error) {
      setError("Invalid email or password");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm p-6 bg-white rounded-lg shadow space-y-4"
      >
        <h1 className="text-xl font-semibold">Internal Audit Platform</h1>
        {accepted && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-2 rounded">
            Invite accepted. Please log in.
          </div>
        )}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="block text-sm">Email</label>
          <input
            className="w-full border rounded px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Password</label>
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          className="w-full py-2 rounded bg-black text-white hover:opacity-90"
          type="submit"
        >
          Sign in
        </button>
        <p className="text-xs text-gray-500">
          Don't have an account? Ask an Admin to invite you.
        </p>
      </form>
    </div>
  );
}