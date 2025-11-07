import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isCFO } from "@/lib/rbac";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ClientUploader } from "./ClientUploader";

export default async function ImportPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!isCFO((session.user as any)?.role)) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-gray-900">Data import</h1>
        <p className="text-sm text-pink-600">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Data import (Excel)</h1>
        <p className="text-sm text-text-light">
          Upload a single workbook containing `Plants`, `Audits`, and `Observations` sheets. Validate it first, then run the
          import.
        </p>
      </div>

      <Card variant="feature" className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Template & documentation</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/api/v1/import/template">Download template</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/docs/import-spec">Read import spec</Link>
          </Button>
        </div>
      </Card>

      <Card variant="feature" className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Upload & validate</h2>
        <ClientUploader />
      </Card>
    </div>
  );
}

 


