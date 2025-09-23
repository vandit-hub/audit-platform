"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm p-6 bg-white rounded-lg shadow space-y-4"
      >
        <h1 className="text-xl font-semibold">Accept Invitation</h1>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="block text-sm">Invite token</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500">
            (Paste the token you received from the Admin.)
          </p>
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Your name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Create password</label>
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <p className="text-xs text-gray-500">
            Use at least 8 chars, with letters, numbers & symbols.
          </p>
        </div>
        <button
          className="w-full py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-50"
          type="submit"
          disabled={busy}
        >
          {busy ? "Working…" : "Accept invite"}
        </button>
      </form>
    </div>
  );
}