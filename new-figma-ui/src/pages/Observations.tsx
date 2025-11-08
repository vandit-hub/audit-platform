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
import { Checkbox } from '../components/ui/checkbox';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import { mockObservations, mockAudits, mockPlants } from '../data/mockData';
import { Plus, Eye, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Observation } from '../types';
import { PageContainer } from '../components/PageContainer';
import { PageTitle } from '../components/PageTitle';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface ObservationsProps {
  onViewObservation?: (observationId: string) => void;
}

export function Observations({ onViewObservation }: ObservationsProps) {
  const { user } = useAuth();
  const [observations, setObservations] = useState<Observation[]>(mockObservations);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedObservations, setSelectedObservations] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    plant: '',
    audit: '',
    risk: '',
    status: '',
    search: ''
  });
  const [newObservation, setNewObservation] = useState({
    auditId: '',
    observationText: ''
  });

  const isAuditHead = user?.role === 'audit_head';

  const handleCreateObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const audit = mockAudits.find(a => a.id === newObservation.auditId);
    const observation: Observation = {
      id: Date.now().toString(),
      auditId: newObservation.auditId,
      auditTitle: audit?.title || '',
      plantId: audit?.plantId || '',
      plantName: audit?.plantName || '',
      observationText: newObservation.observationText,
      process: 'General',
      riskLevel: 'medium',
      status: 'open',
      isApproved: false,
      isPublished: false,
      auditorNotes: '',
      auditeeResponse: '',
      assignedAuditees: [],
      createdAt: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    setObservations([...observations, observation]);
    setNewObservation({ auditId: '', observationText: '' });
    setIsCreateDialogOpen(false);
  };

  const filteredObservations = observations.filter(obs => {
    if (filters.plant && filters.plant !== 'all' && obs.plantId !== filters.plant) return false;
    if (filters.audit && filters.audit !== 'all' && obs.auditId !== filters.audit) return false;
    if (filters.risk && filters.risk !== 'all' && obs.riskLevel !== filters.risk) return false;
    if (filters.status && filters.status !== 'all' && obs.status !== filters.status) return false;
    if (filters.search && !obs.observationText.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedObservations(filteredObservations.map(obs => obs.id));
    } else {
      setSelectedObservations([]);
    }
  };

  const handleSelectObservation = (observationId: string, checked: boolean) => {
    if (checked) {
      setSelectedObservations([...selectedObservations, observationId]);
    } else {
      setSelectedObservations(selectedObservations.filter(id => id !== observationId));
    }
  };

  const handleBulkApprove = () => {
    setObservations(observations.map(obs => 
      selectedObservations.includes(obs.id) 
        ? { ...obs, isApproved: true }
        : obs
    ));
    toast.success(`${selectedObservations.length} observation(s) approved`);
    setSelectedObservations([]);
  };

  const handleBulkUnapprove = () => {
    setObservations(observations.map(obs => 
      selectedObservations.includes(obs.id) 
        ? { ...obs, isApproved: false }
        : obs
    ));
    toast.success(`${selectedObservations.length} observation(s) unapproved`);
    setSelectedObservations([]);
  };

  const handleBulkPublish = () => {
    setObservations(observations.map(obs => 
      selectedObservations.includes(obs.id) 
        ? { ...obs, isPublished: true }
        : obs
    ));
    toast.success(`${selectedObservations.length} observation(s) published`);
    setSelectedObservations([]);
  };

  const handleBulkUnpublish = () => {
    setObservations(observations.map(obs => 
      selectedObservations.includes(obs.id) 
        ? { ...obs, isPublished: false }
        : obs
    ));
    toast.success(`${selectedObservations.length} observation(s) unpublished`);
    setSelectedObservations([]);
  };

  const allSelected = filteredObservations.length > 0 && selectedObservations.length === filteredObservations.length;
  const someSelected = selectedObservations.length > 0 && selectedObservations.length < filteredObservations.length;

  return (
    <PageContainer className="space-y-6">
      <PageTitle 
        title="Observations" 
        description="Track and manage audit observations"
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Observation
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Observation</DialogTitle>
              <DialogDescription>Add a new observation to an audit</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateObservation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="audit">Audit</Label>
                <Select value={newObservation.auditId} onValueChange={(value) => setNewObservation({ ...newObservation, auditId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select audit" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockAudits.map(audit => (
                      <SelectItem key={audit.id} value={audit.id}>
                        {audit.title} - {audit.plantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observation">Observation</Label>
                <Textarea
                  id="observation"
                  placeholder="Describe the observation..."
                  value={newObservation.observationText}
                  onChange={(e) => setNewObservation({ ...newObservation, observationText: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Observation</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Refine observation results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Plant</Label>
              <Select value={filters.plant} onValueChange={(value) => setFilters({ ...filters, plant: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Plants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  {mockPlants.map(plant => (
                    <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audit</Label>
              <Select value={filters.audit} onValueChange={(value) => setFilters({ ...filters, audit: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Audits" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Audits</SelectItem>
                  {mockAudits.map(audit => (
                    <SelectItem key={audit.id} value={audit.id}>{audit.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select value={filters.risk} onValueChange={(value) => setFilters({ ...filters, risk: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Risks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Observations ({filteredObservations.length})</CardTitle>
              <CardDescription>Filtered observation results</CardDescription>
            </div>
            {isAuditHead && selectedObservations.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                  {selectedObservations.length} selected
                </span>
                <Button
                  onClick={handleBulkApprove}
                  size="sm"
                  className="gap-1.5"
                  style={{ background: 'var(--c-palUiGre600)', color: 'white' }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  onClick={handleBulkUnapprove}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Unapprove
                </Button>
                <Button
                  onClick={handleBulkPublish}
                  size="sm"
                  className="gap-1.5"
                  style={{ background: 'var(--c-palUiBlu600)', color: 'white' }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Publish
                </Button>
                <Button
                  onClick={handleBulkUnpublish}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Unpublish
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isAuditHead && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all observations"
                      className={someSelected ? 'data-[state=checked]:bg-gray-400' : ''}
                    />
                  </TableHead>
                )}
                <TableHead>Observation</TableHead>
                <TableHead>Audit</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObservations.map((obs) => (
                <TableRow key={obs.id}>
                  {isAuditHead && (
                    <TableCell>
                      <Checkbox
                        checked={selectedObservations.includes(obs.id)}
                        onCheckedChange={(checked) => handleSelectObservation(obs.id, checked as boolean)}
                        aria-label={`Select observation ${obs.id}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="max-w-xs">
                    <p className="truncate">{obs.observationText}</p>
                    <p className="text-sm text-gray-500">{obs.process}</p>
                  </TableCell>
                  <TableCell>{obs.auditTitle}</TableCell>
                  <TableCell>{obs.plantName}</TableCell>
                  <TableCell><RiskBadge level={obs.riskLevel} /></TableCell>
                  <TableCell><StatusBadge status={obs.status} /></TableCell>
                  <TableCell className="text-sm">{obs.dueDate}</TableCell>
                  <TableCell>
                    {obs.isApproved ? (
                      <Badge variant="outline" style={{ borderColor: 'var(--c-palUiGre600)', color: 'var(--c-palUiGre700)', background: 'var(--c-palUiGre100)' }}>
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {obs.isPublished ? (
                      <Badge variant="outline" style={{ borderColor: 'var(--c-palUiBlu600)', color: 'var(--c-palUiBlu700)', background: 'var(--c-palUiBlu100)' }}>
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewObservation?.(obs.id)}
                      className="gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
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
