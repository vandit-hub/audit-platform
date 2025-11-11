"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { isCFOOrCXOTeam, isCFO } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageContainer } from "@/components/PageContainer";
import { PageTitle } from "@/components/PageTitle";
import { UserPlus, Link2, Copy, Check } from "lucide-react";

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"GUEST" | "AUDITEE" | "AUDITOR" | "CXO_TEAM" | "AUDIT_HEAD">("GUEST");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { showSuccess, showError } = useToast();

  if (!session?.user?.role || !isCFOOrCXOTeam(session.user.role)) {
    redirect("/");
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setInviteToken(null);

    try {
      const response = await fetch("/api/v1/auth/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role,
          expiresInDays,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteToken(data.token);
        setEmail("");
        setRole("GUEST");
        setExpiresInDays(7);
        showSuccess(`Invitation created successfully for ${email}!`);
      } else {
        const errorMessage = data.message || "Failed to create invitation";
          showError(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred while creating the invitation";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (inviteToken) {
      const inviteUrl = `${window.location.origin}/accept-invite?token=${inviteToken}`;

      try {
        // Try using the modern clipboard API (requires HTTPS)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(inviteUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          showSuccess("Invite link copied to clipboard!");
        } else {
          // Fallback for HTTP - create a temporary textarea
          const textarea = document.createElement('textarea');
          textarea.value = inviteUrl;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          showSuccess("Invite link copied to clipboard!");
        }
      } catch (err) {
        console.error('Failed to copy:', err);
        showError("Failed to copy to clipboard. Please copy manually.");
      }
    }
  };

  return (
    <PageContainer className="space-y-6">
      <PageTitle
        title="Admin"
        description="System administration and configuration"
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          {isCFO(session?.user?.role) && <TabsTrigger value="import">Data Import</TabsTrigger>}
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invite New User</CardTitle>
              <CardDescription>Send an invitation to join the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={(value) => setRole(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GUEST">Guest</SelectItem>
                        <SelectItem value="AUDITEE">Auditee</SelectItem>
                        <SelectItem value="AUDITOR">Auditor</SelectItem>
                        {isCFO(session?.user?.role) && (
                          <>
                            <SelectItem value="CXO_TEAM">CXO Team</SelectItem>
                            <SelectItem value="AUDIT_HEAD">Audit Head</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry (Days)</Label>
                    <Input
                      id="expiry"
                      type="number"
                      placeholder="7"
                      min="1"
                      max="30"
                      value={expiresInDays.toString()}
                      onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Invitation will expire after this many days (1-30)
                    </p>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {isLoading ? "Creating Invitation..." : "Generate Invite Link"}
                </Button>
              </form>

              {inviteToken && (
                <div className="mt-6 space-y-3">
                  <Alert>
                    <Link2 className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <code className="flex-1 text-sm bg-gray-100 p-2 rounded break-all">
                          {`${window.location.origin}/accept-invite?token=${inviteToken}`}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyInviteLink}
                          className="gap-2 shrink-0"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>Users with access to the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">User list coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isCFO(session?.user?.role) && (
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Import</CardTitle>
                <CardDescription>Import data from Excel files (CFO only)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Data import functionality coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}