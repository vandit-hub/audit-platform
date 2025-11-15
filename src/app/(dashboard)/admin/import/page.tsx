import { auth } from "@/lib/auth";
import { isCFO } from "@/lib/rbac";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import { ClientUploader } from "./ClientUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/v2/card";
import { Button } from "@/components/ui/v2/button";
import { PageContainer } from "@/components/v2/PageContainer";
import { PageTitle } from "@/components/PageTitle";
import { Download, FileText } from "lucide-react";

export default async function ImportPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!isCFO((session.user as any)?.role)) {
    return (
      <PageContainer>
        <PageTitle title="Data Import" description="Import data from Excel files" />
        <Card>
          <CardContent>
            <p className="text-destructive">You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <PageTitle
        title="Excel Import"
        description="Import data from Excel files (CFO only)"
      />

      <Card>
        <CardHeader>
          <CardTitle>Upload & Validate</CardTitle>
          <CardDescription>
            Upload .xlsx files with Plants, Audits, and Observations sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-3">
            <Link href="/api/v1/import/template">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </Link>
            <Link href="/docs/import-spec">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Read Import Spec
              </Button>
            </Link>
          </div>

          <ClientUploader />
        </CardContent>
      </Card>
    </PageContainer>
  );
}

 


