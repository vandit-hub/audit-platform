import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { MultiSelectInput } from '../components/MultiSelectInput';
import { mockAudits, mockPlants } from '../data/mockData';
import { Plus, Lock, Unlock, ExternalLink } from 'lucide-react';
import { Audit } from '../types';
import { PageContainer } from '../components/PageContainer';
import { PageTitle } from '../components/PageTitle';

interface AuditsProps {
  onOpenAudit: (auditId: string) => void;
}

export function Audits({ onOpenAudit }: AuditsProps) {
  const [audits, setAudits] = useState<Audit[]>(mockAudits);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAudit, setNewAudit] = useState({
    plantId: '',
    title: '',
    purpose: '',
    startDate: '',
    endDate: '',
    auditHead: '',
    auditors: [] as string[]
  });

  // Mock list of available users for suggestions
  const availableUsers = [
    'John Doe',
    'Jane Smith',
    'Mike Johnson',
    'Sarah Williams',
    'Tom Brown',
    'Alice Cooper',
    'Bob Wilson',
    'Eleanor Vance',
    'Marcus Hayes',
    'Jenna Ortega',
    'David Chen'
  ];

  const handleCreateAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const plant = mockPlants.find(p => p.id === newAudit.plantId);
    const audit: Audit = {
      id: Date.now().toString(),
      plantId: newAudit.plantId,
      plantName: plant?.name || '',
      title: newAudit.title,
      purpose: newAudit.purpose,
      startDate: newAudit.startDate,
      endDate: newAudit.endDate,
      isLocked: false,
      progress: 0,
      auditHead: newAudit.auditHead,
      auditors: newAudit.auditors,
      visibility: 'public'
    };
    setAudits([...audits, audit]);
    setNewAudit({ plantId: '', title: '', purpose: '', startDate: '', endDate: '', auditHead: '', auditors: [] });
    setIsDialogOpen(false);
  };

  const toggleLock = (auditId: string) => {
    setAudits(audits.map(audit => 
      audit.id === auditId ? { ...audit, isLocked: !audit.isLocked } : audit
    ));
  };

  return (
    <PageContainer className="space-y-6">
      <PageTitle 
        title="Audits" 
        description="Manage audit processes"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Audit
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Audit</DialogTitle>
              <DialogDescription>Set up a new audit process with detailed information</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAudit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plant">Plant *</Label>
                  <Select value={newAudit.plantId} onValueChange={(value) => setNewAudit({ ...newAudit, plantId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPlants.map(plant => (
                        <SelectItem key={plant.id} value={plant.id}>
                          {plant.name} ({plant.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auditHead">Audit Head *</Label>
                  <Select value={newAudit.auditHead} onValueChange={(value) => setNewAudit({ ...newAudit, auditHead: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audit head" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user} value={user}>
                          {user}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Audit Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Q2 Financial Systems Audit"
                  value={newAudit.title}
                  onChange={(e) => setNewAudit({ ...newAudit, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose *</Label>
                <Textarea
                  id="purpose"
                  placeholder="Describe the objectives, scope, and key focus areas of this audit. Include any specific compliance requirements, regulations, or standards that need to be verified..."
                  value={newAudit.purpose}
                  onChange={(e) => setNewAudit({ ...newAudit, purpose: e.target.value })}
                  rows={6}
                  required
                />
                <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                  Provide a comprehensive description of the audit objectives and scope
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditors">Assign Auditors</Label>
                <MultiSelectInput
                  values={newAudit.auditors}
                  onChange={(auditors) => setNewAudit({ ...newAudit, auditors })}
                  placeholder="Type name and press Enter to add auditors..."
                  suggestions={availableUsers.filter(u => u !== newAudit.auditHead)}
                />
                <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                  Press Enter to add each auditor. Multiple auditors can be assigned.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newAudit.startDate}
                    onChange={(e) => setNewAudit({ ...newAudit, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newAudit.endDate}
                    onChange={(e) => setNewAudit({ ...newAudit, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color-regular)' }}>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Audit</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Audits</CardTitle>
          <CardDescription>Complete list of audit processes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Lock Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Auditors</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell>{audit.title}</TableCell>
                  <TableCell>{audit.plantName}</TableCell>
                  <TableCell className="text-sm">
                    {audit.startDate} to {audit.endDate}
                  </TableCell>
                  <TableCell>
                    {audit.isLocked ? (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Unlock className="h-3 w-3" />
                        Unlocked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={audit.progress} className="h-1.5 w-24" />
                      <span className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                        {audit.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{audit.auditHead}</p>
                      <p className="text-gray-500">+{audit.auditors.length} auditors</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenAudit(audit.id)}
                        className="gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLock(audit.id)}
                      >
                        {audit.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
