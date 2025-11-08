import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ClipboardList } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--c-bacSec)' }}>
      <Card className="w-full max-w-md" style={{ border: '1px solid var(--c-borPri)', borderRadius: 'var(--border-radius-700)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)' }}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ClipboardList className="h-12 w-12" style={{ color: 'var(--c-texPri)' }} />
          </div>
          <CardTitle style={{ fontSize: '24px', marginBottom: '8px' }}>Audit Manager</CardTitle>
          <CardDescription style={{ color: 'var(--c-texSec)', fontSize: '14px' }}>
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center mt-4" style={{ fontSize: '13px', color: 'var(--c-texSec)' }}>
              <p style={{ marginBottom: '8px' }}>Demo accounts:</p>
              <p style={{ fontSize: '12px', color: 'var(--c-texTer)' }}>cfo@example.com / password</p>
              <p style={{ fontSize: '12px', color: 'var(--c-texTer)' }}>admin@example.com / password</p>
              <p style={{ fontSize: '12px', color: 'var(--c-texTer)' }}>audithead@example.com / password</p>
              <p style={{ fontSize: '12px', color: 'var(--c-texTer)' }}>auditor@example.com / password</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
