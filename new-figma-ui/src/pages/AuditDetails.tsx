import { useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Progress } from '../components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { mockAudits, mockObservations } from '../data/mockData';
import { Edit, Download, ChevronRight } from 'lucide-react';
import { StatusBadge, RiskBadge } from '../components/StatusBadge';
import { PageContainer } from '../components/PageContainer';

interface AuditDetailsProps {
  auditId: string;
  onBack: () => void;
}

export function AuditDetails({ auditId, onBack }: AuditDetailsProps) {
  const audit = mockAudits.find(a => a.id === auditId);
  
  const linkedObservations = useMemo(() => {
    if (!auditId) return [];
    return mockObservations.filter(obs => obs.auditId === auditId);
  }, [auditId]);

  if (!audit) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <h1 className="text-2xl mb-4" style={{ color: 'var(--c-texPri)' }}>
            Audit not found
          </h1>
          <Button onClick={onBack}>
            Back to Audits
          </Button>
        </div>
      </PageContainer>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Mock checklist data
  const checklists = [
    {
      id: '1',
      name: 'Accounts Payable Verification',
      status: 'in_progress',
      progress: 80,
      assignedTo: audit.auditors[0] || 'Unassigned'
    },
    {
      id: '2',
      name: 'System Access & Security Review',
      status: 'not_started',
      progress: 0,
      assignedTo: audit.auditors[1] || 'Unassigned'
    },
    {
      id: '3',
      name: 'Compliance Documentation Check',
      status: 'completed',
      progress: 100,
      assignedTo: audit.auditors[2] || 'Unassigned'
    }
  ];

  return (
    <PageContainer className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-texSec)' }}>
        <span className="hover:underline cursor-pointer" onClick={onBack}>
          Audits
        </span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>AUD-{audit.id.padStart(4, '0')}</span>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl" style={{ color: 'var(--c-texPri)' }}>
          AUD-{audit.id.padStart(4, '0')}: {audit.title}
        </h1>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2 px-3 h-8">
            <Edit className="h-4 w-4" />
            Edit Audit
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 px-3 h-8">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--c-texSec)' }}>Overall Progress</span>
          <span style={{ color: 'var(--c-texPri)' }}>
            {audit.progress}%
          </span>
        </div>
        <Progress value={audit.progress} className="h-2" />
      </div>

      {/* Key Information Grid */}
      <div className="grid grid-cols-3 gap-x-16 gap-y-6">
        {/* Status */}
        <div className="space-y-1.5">
          <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Status</p>
          <Badge 
            variant={audit.isLocked ? "secondary" : "default"}
            className="h-6"
          >
            {audit.isLocked ? 'Completed' : 'In Progress'}
          </Badge>
        </div>

        {/* Audit Head */}
        <div className="space-y-1.5">
          <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Audit Head</p>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback 
                className="text-xs"
                style={{ background: 'var(--c-palUiBlu100)', color: 'var(--c-palUiBlu600)' }}
              >
                {getInitials(audit.auditHead)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>
              {audit.auditHead}
            </span>
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Start Date</p>
          <p className="text-sm" style={{ color: 'var(--c-texPri)' }}>
            {new Date(audit.startDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>End Date</p>
          <p className="text-sm" style={{ color: 'var(--c-texPri)' }}>
            {new Date(audit.endDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Audit Type */}
        <div className="space-y-1.5">
          <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Audit Type</p>
          <p className="text-sm" style={{ color: 'var(--c-texPri)' }}>
            {audit.visibility === 'public' ? 'Financial' : 'Confidential'}
          </p>
        </div>

        {/* Associated Plants */}
        <div className="space-y-1.5">
          <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Associated Plants</p>
          <p className="text-sm" style={{ color: 'var(--c-texPri)' }}>
            {audit.plantName}
          </p>
        </div>
      </div>

      {/* Assigned Auditors */}
      <div className="space-y-3">
        <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Assigned Auditors</p>
        <div className="flex items-center gap-4">
          {audit.auditors.map((auditor, index) => (
            <div key={index} className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback 
                  className="text-xs"
                  style={{ background: 'var(--c-palUiBlu100)', color: 'var(--c-palUiBlu600)' }}
                >
                  {getInitials(auditor)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>
                {auditor}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Linked Observations */}
      <div className="space-y-4">
        <h2 className="text-xl" style={{ color: 'var(--c-texPri)' }}>
          Linked Observations
        </h2>
        
        {linkedObservations.length === 0 ? (
          <div 
            className="text-center py-12 border rounded-lg" 
            style={{ 
              borderColor: 'var(--border-color-regular)',
              background: 'white'
            }}
          >
            <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>
              No observations linked to this audit yet
            </p>
          </div>
        ) : (
          <div 
            className="border rounded-lg overflow-hidden" 
            style={{ 
              borderColor: 'var(--border-color-regular)',
              background: 'white'
            }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedObservations.map((obs) => (
                  <TableRow key={obs.id}>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      OBS-{obs.id.padStart(3, '0')}
                    </TableCell>
                    <TableCell className="max-w-md" style={{ whiteSpace: 'normal' }}>
                      {obs.observationText}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={obs.status} />
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={obs.riskLevel} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {obs.assignedAuditees.length > 0 ? (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback 
                                className="text-xs"
                                style={{ background: 'var(--c-palUiBlu100)', color: 'var(--c-palUiBlu600)' }}
                              >
                                {getInitials(obs.assignedAuditees[0])}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>
                              {obs.assignedAuditees[0]}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                            Unassigned
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Checklists */}
      <div className="space-y-4">
        <h2 className="text-xl" style={{ color: 'var(--c-texPri)' }}>
          Checklists
        </h2>
        
        <div 
          className="border rounded-lg overflow-hidden" 
          style={{ 
            borderColor: 'var(--border-color-regular)',
            background: 'white'
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Checklist Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checklists.map((checklist) => (
                <TableRow key={checklist.id}>
                  <TableCell>{checklist.name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        checklist.status === 'completed' ? 'default' : 
                        checklist.status === 'in_progress' ? 'secondary' : 
                        'outline'
                      }
                    >
                      {checklist.status === 'completed' ? 'Completed' : 
                       checklist.status === 'in_progress' ? 'In Progress' : 
                       'Not Started'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={checklist.progress} className="h-1.5 w-32" />
                      <span className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                        {checklist.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback 
                          className="text-xs"
                          style={{ background: 'var(--c-palUiBlu100)', color: 'var(--c-palUiBlu600)' }}
                        >
                          {getInitials(checklist.assignedTo)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>
                        {checklist.assignedTo}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageContainer>
  );
}
