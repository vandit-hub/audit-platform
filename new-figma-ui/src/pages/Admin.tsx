import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Upload, Link2, Copy, Check, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types';
import { PageContainer } from '../components/PageContainer';
import { PageTitle } from '../components/PageTitle';

interface AdminProps {
  onNavigate?: (page: string) => void;
}

export function Admin({ onNavigate }: AdminProps = {}) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('auditor');
  const [expiryDays, setExpiryDays] = useState('30');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<Array<{ sheet: string; row: number; column: string; message: string }>>([]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const token = Math.random().toString(36).substring(7);
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    setInviteLink(link);
    setInviteEmail('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setValidationStatus('validating');
    setValidationErrors([]);

    // Mock validation - simulate API call
    setTimeout(() => {
      // Simulating some validation errors for demo
      const mockErrors = [
        { sheet: 'Audits', row: 5, column: 'status', message: 'Invalid enum value. Expected: PLANNED, IN_PROGRESS, SUBMITTED, or SIGNED_OFF' },
        { sheet: 'Observations', row: 12, column: 'visit_start_date', message: 'Invalid date format. Expected: YYYY-MM-DD' },
      ];

      // Randomly decide if validation passes or fails (for demo)
      const hasErrors = Math.random() > 0.5;
      
      if (hasErrors) {
        setValidationErrors(mockErrors);
        setValidationStatus('error');
      } else {
        setValidationStatus('success');
      }
    }, 1500);
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && validationStatus === 'success') {
      alert('File uploaded successfully! (Mock functionality)');
      setFile(null);
      setValidationStatus('idle');
      setValidationErrors([]);
    }
  };

  const handleDownloadTemplate = () => {
    // Mock template download
    alert('Downloading template from /api/v1/import/template (Mock functionality)');
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
          {user?.role === 'cfo' && <TabsTrigger value="import">Data Import</TabsTrigger>}
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invite New User</CardTitle>
              <CardDescription>Send an invitation to join the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auditor">Auditor</SelectItem>
                        <SelectItem value="auditee">Auditee</SelectItem>
                        <SelectItem value="audit_head">Audit Head</SelectItem>
                        {user?.role === 'cfo' && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry (Days)</Label>
                    <Input
                      id="expiry"
                      type="number"
                      placeholder="30"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Generate Invite Link
                </Button>
              </form>

              {inviteLink && (
                <div className="mt-6 space-y-3">
                  <Alert>
                    <Link2 className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <code className="flex-1 text-sm bg-gray-100 p-2 rounded break-all">
                          {inviteLink}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
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
                {[
                  { name: 'CFO User', email: 'cfo@example.com', role: 'cfo' },
                  { name: 'Admin User', email: 'admin@example.com', role: 'admin' },
                  { name: 'Auditor User', email: 'auditor@example.com', role: 'auditor' }
                ].map((u, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p>{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm px-2 py-1 bg-gray-100 rounded capitalize">
                        {u.role.replace('_', ' ')}
                      </span>
                      {user?.role === 'cfo' && (
                        <Button variant="ghost" size="sm">Edit</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'cfo' && (
          <TabsContent value="import" className="space-y-6">
            <Card style={{ borderColor: 'var(--c-borPri)' }}>
              <CardHeader>
                <CardTitle>Excel Import</CardTitle>
                <CardDescription>Import data from Excel files (CFO only)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Help Links */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.('import-spec')}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Read Import Spec
                  </Button>
                </div>

                <form onSubmit={handleValidate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Select Excel File</Label>
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center"
                      style={{ borderColor: 'var(--c-borPri)' }}
                    >
                      <Upload className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--c-texTer)' }} />
                      <Input
                        id="file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          setFile(e.target.files?.[0] || null);
                          setValidationStatus('idle');
                          setValidationErrors([]);
                        }}
                        className="max-w-xs mx-auto"
                      />
                      <p className="text-sm mt-2" style={{ color: 'var(--c-texSec)' }}>
                        Upload .xlsx files with Plants, Audits, and Observations sheets
                      </p>
                    </div>
                  </div>

                  {file && (
                    <div 
                      className="flex items-center justify-between p-3 rounded"
                      style={{ background: 'var(--c-bacTer)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>{file.name}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setFile(null);
                          setValidationStatus('idle');
                          setValidationErrors([]);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  {/* Validation Status */}
                  {validationStatus === 'validating' && (
                    <Alert style={{ borderColor: 'var(--c-palUiBlu200)', background: 'var(--c-palUiBlu100)' }}>
                      <AlertCircle className="h-4 w-4" style={{ color: 'var(--c-palUiBlu600)' }} />
                      <AlertDescription style={{ color: 'var(--c-palUiBlu700)' }}>
                        Validating file... Please wait.
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationStatus === 'success' && (
                    <Alert style={{ borderColor: 'var(--c-palUiGre200)', background: 'var(--c-palUiGre100)' }}>
                      <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--c-palUiGre600)' }} />
                      <AlertDescription style={{ color: 'var(--c-palUiGre700)' }}>
                        Validation successful! File is ready to import.
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationStatus === 'error' && (
                    <Alert style={{ borderColor: 'var(--c-palUiRed200)', background: 'var(--c-palUiRed100)' }}>
                      <AlertCircle className="h-4 w-4" style={{ color: 'var(--c-palUiRed600)' }} />
                      <AlertDescription style={{ color: 'var(--c-palUiRed700)' }}>
                        <p className="mb-3">Validation failed. Please fix the following errors:</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {validationErrors.map((error, idx) => (
                            <div 
                              key={idx} 
                              className="p-2.5 rounded text-xs"
                              style={{ background: 'white', border: '1px solid var(--c-palUiRed200)' }}
                            >
                              <div style={{ color: 'var(--c-texPri)', fontWeight: 600 }}>
                                Sheet: {error.sheet}, Row: {error.row}, Column: {error.column}
                              </div>
                              <div style={{ color: 'var(--c-texSec)' }}>{error.message}</div>
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={!file || validationStatus === 'validating'} 
                      className="gap-2"
                      variant={validationStatus === 'success' ? 'outline' : 'default'}
                    >
                      <AlertCircle className="h-4 w-4" />
                      Validate File
                    </Button>
                    
                    <Button 
                      type="button"
                      onClick={handleFileUpload}
                      disabled={validationStatus !== 'success'} 
                      className="gap-2"
                      style={validationStatus === 'success' ? { background: 'var(--c-palUiGre600)', color: 'white' } : {}}
                    >
                      <Upload className="h-4 w-4" />
                      Import Data
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import History</CardTitle>
                <CardDescription>Recent data imports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p>plants_data.xlsx</p>
                      <p className="text-sm text-gray-500">Imported 15 plants on 2024-11-01</p>
                    </div>
                    <span className="text-sm text-green-600">Success</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p>observations_q3.xlsx</p>
                      <p className="text-sm text-gray-500">Imported 42 observations on 2024-10-15</p>
                    </div>
                    <span className="text-sm text-green-600">Success</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
