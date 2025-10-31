import { auth } from "@/lib/auth";
import { isCFO } from "@/lib/rbac";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import { ClientUploader } from "./ClientUploader";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div className="rounded border p-4 bg-white">{children}</div>
    </section>
  );
}

export default async function ImportPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!isCFO((session.user as any)?.role)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Data Import</h1>
        <p className="text-red-600">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Data Import (Excel)</h1>
      <p className="text-gray-600">
        Upload a single .xlsx with sheets <code>Plants</code>, <code>Audits</code>, and <code>Observations</code>. First run a dry-run to validate, then import.
      </p>

      <Section title="Template & Docs">
        <div className="flex gap-4">
          <Link className="text-blue-600 underline" href="/api/v1/import/template">Download template</Link>
          <Link className="text-blue-600 underline" href="/docs/import-spec">Read import spec</Link>
        </div>
      </Section>

      <Section title="Upload & Validate">
        <ClientUploader />
      </Section>
    </div>
  );
}

 


