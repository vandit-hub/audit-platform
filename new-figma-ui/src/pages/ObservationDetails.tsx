import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { mockObservations, mockAudits } from '../data/mockData';
import { ChevronRight, Check, Clock, Send, X, Plus, Upload, FileText, Download, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { PageContainer } from '../components/PageContainer';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

interface ObservationDetailsProps {
  observationId: string;
  onBack: () => void;
}

interface ActionPlanItem {
  id: string;
  plan: string;
  owner: string;
  date: string;
  status: 'pending' | 'completed';
  retestStatus?: 'pass' | 'fail' | null;
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadDate: string;
}

export function ObservationDetails({ observationId, onBack }: ObservationDetailsProps) {
  const { user } = useAuth();
  const observation = mockObservations.find(o => o.id === observationId);
  const audit = observation ? mockAudits.find(a => a.id === observation.auditId) : null;
  
  const isAuditorOrHead = user?.role === 'auditor' || user?.role === 'audit_head';
  
  // Form states
  const [observationText, setObservationText] = useState('Database backup logs show 3 failed backups in last month. No automated alerting system in place for backup failures.');
  const [risksInvolved, setRisksInvolved] = useState('');
  const [riskCategory, setRiskCategory] = useState('B');
  const [likelyImpact, setLikelyImpact] = useState('Org-wide');
  const [concernedProcess, setConcernedProcess] = useState('R2R');
  const [auditorPerson, setAuditorPerson] = useState('Karthik Iyer');
  const [assignedAuditees, setAssignedAuditees] = useState<string[]>(['IT Head', 'CTO']);
  const [newAuditee, setNewAuditee] = useState('');
  
  const [auditeePerson1, setAuditeePerson1] = useState('IT Head');
  const [auditeePerson2, setAuditeePerson2] = useState('CTO');
  const [auditeeFeedback, setAuditeeFeedback] = useState('Monitoring system procurement in progress, expected implementation in Q1 2025');
  const [auditorResponse, setAuditorResponse] = useState('Backup policy needs revision to include real-time monitoring and escalation matrix');
  
  const [currentStatus, setCurrentStatus] = useState('Pending MR');
  const [isApproved, setIsApproved] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [showChangeRequestDialog, setShowChangeRequestDialog] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  
  // Action Plans
  const [actionPlans, setActionPlans] = useState<ActionPlanItem[]>([
    {
      id: '1',
      plan: 'Implement automated backup monitoring system',
      owner: 'IT Head',
      date: '2025-01-31',
      status: 'pending',
      retestStatus: null
    }
  ]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({ plan: '', owner: '', date: '', status: 'pending' as const });
  
  // Attachments
  const [annexures, setAnnexures] = useState<Attachment[]>([
    {
      id: '1',
      name: 'backup-logs-screenshot.png',
      size: '1.2 MB',
      uploadedBy: 'Karthik Iyer',
      uploadDate: 'Nov 5, 2024'
    }
  ]);
  const [managementDocs, setManagementDocs] = useState<Attachment[]>([]);
  
  // Running notes and activity
  const [runningNote, setRunningNote] = useState('');
  const runningNotes = [
    {
      id: '1',
      author: 'Sarah Lee',
      timestamp: '2 days ago',
      content: "Thanks for the heads-up. I've scheduled a vendor to come in and service all extinguishers by the end of the week. I'll upload the new service records once complete."
    },
    {
      id: '2',
      author: 'Mark Johnson',
      timestamp: '3 days ago',
      content: '@Sarah Lee - Please review this finding and provide a remediation plan by the due date.'
    }
  ];

  const changeRequests = [
    {
      id: '1',
      author: 'Sarah Lee',
      timestamp: '2 days ago',
      description: 'Due date changed from May 28 to May 31.',
    }
  ];

  const approvalHistory = [
    {
      id: '1',
      status: 'Observation Approved',
      date: 'May 17, 2024',
      description: 'Mark Johnson approved the initial finding.',
    }
  ];

  const auditTrail = [
    {
      id: '1',
      action: 'Observation Created',
      date: 'May 16, 2024',
      description: 'Created by Mark Johnson.'
    }
  ];

  if (!observation) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <h1 className="text-2xl mb-4" style={{ color: 'var(--c-texPri)' }}>
            Observation not found
          </h1>
          <Button onClick={onBack}>
            Back to Observations
          </Button>
        </div>
      </PageContainer>
    );
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const addAuditee = () => {
    if (newAuditee.trim() && !assignedAuditees.includes(newAuditee.trim())) {
      setAssignedAuditees([...assignedAuditees, newAuditee.trim()]);
      setNewAuditee('');
    }
  };

  const removeAuditee = (auditee: string) => {
    setAssignedAuditees(assignedAuditees.filter(a => a !== auditee));
  };

  const addActionPlan = () => {
    if (newPlan.plan && newPlan.owner && newPlan.date) {
      setActionPlans([...actionPlans, { ...newPlan, id: Date.now().toString(), retestStatus: null }]);
      setNewPlan({ plan: '', owner: '', date: '', status: 'pending' });
      setShowAddPlan(false);
    }
  };

  const togglePlanStatus = (id: string) => {
    setActionPlans(actionPlans.map(plan => 
      plan.id === id 
        ? { ...plan, status: plan.status === 'pending' ? 'completed' : 'pending' }
        : plan
    ));
  };

  const handleRetestPass = (id: string) => {
    setActionPlans(actionPlans.map(plan => 
      plan.id === id 
        ? { ...plan, retestStatus: 'pass' }
        : plan
    ));
    toast.success('Action plan marked as Retest Pass');
  };

  const handleRetestFail = (id: string) => {
    setActionPlans(actionPlans.map(plan => 
      plan.id === id 
        ? { ...plan, retestStatus: 'fail' }
        : plan
    ));
    toast.error('Action plan marked as Retest Fail');
  };

  const handleApprove = () => {
    setIsApproved(true);
    toast.success('Observation approved successfully');
  };

  const handleReject = () => {
    setIsApproved(false);
    toast.error('Observation rejected');
  };

  const handlePublish = () => {
    setIsPublished(true);
    toast.success('Observation published successfully');
  };

  const handleUnpublish = () => {
    setIsPublished(false);
    toast.success('Observation unpublished successfully');
  };

  const handleChangeRequest = () => {
    if (changeRequestReason.trim()) {
      toast.success('Change request submitted successfully');
      setShowChangeRequestDialog(false);
      setChangeRequestReason('');
    } else {
      toast.error('Please provide a reason for the change request');
    }
  };

  const handleSave = () => {
    if (isApproved && user?.role === 'auditor') {
      toast.error('Cannot save approved observation. Please submit a change request.');
      return;
    }
    toast.success('Observation saved successfully');
  };

  return (
    <PageContainer className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-texSec)' }}>
        <span className="hover:underline cursor-pointer" onClick={onBack}>
          {audit ? `Audit #A${audit.id}` : 'Audits'}
        </span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="hover:underline cursor-pointer" onClick={onBack}>
          Observations
        </span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>OBS-{observation.id.padStart(3, '0')}</span>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl" style={{ color: 'var(--c-texPri)' }}>
                {observation.observationText}
              </h1>
              {isApproved && (
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    background: 'var(--c-palUiGre100)',
                    color: 'var(--c-palUiGre700)'
                  }}
                >
                  Approved
                </span>
              )}
              {isPublished && (
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    background: 'var(--c-palUiBlu100)',
                    color: 'var(--c-palUiBlu700)'
                  }}
                >
                  Published
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>
              OBS-{observation.id.padStart(3, '0')} • Created on {new Date(observation.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-md text-sm" style={{ color: 'var(--c-texSec)' }}>
              Status:
            </div>
            <Select value={currentStatus} onValueChange={setCurrentStatus}>
              <SelectTrigger 
                className="w-[180px] h-9"
                style={{ 
                  background: 'white',
                  border: '1px solid var(--c-borPri)'
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending MR">Pending MR</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              className="h-8 px-3"
              onClick={handleSave}
              disabled={isApproved && user?.role === 'auditor'}
              style={{ 
                background: (isApproved && user?.role === 'auditor') ? 'var(--c-texTer)' : 'var(--c-palUiBlu600)', 
                color: 'white',
                cursor: (isApproved && user?.role === 'auditor') ? 'not-allowed' : 'pointer',
                opacity: (isApproved && user?.role === 'auditor') ? 0.5 : 1
              }}
            >
              Save
            </Button>
            
            {/* Audit Head buttons */}
            {user?.role === 'audit_head' && (
              <>
                <Button 
                  size="sm" 
                  className="h-8 px-3"
                  onClick={isPublished ? handleUnpublish : handlePublish}
                  style={{ 
                    background: isPublished ? 'var(--c-palUiOra600)' : 'var(--c-palUiGre600)', 
                    color: 'white' 
                  }}
                >
                  {isPublished ? 'Unpublish' : 'Publish'}
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 px-3"
                  onClick={handleApprove}
                  disabled={isApproved}
                  style={{ 
                    background: isApproved ? 'var(--c-palUiGre700)' : 'var(--c-palUiGre600)', 
                    color: 'white',
                    opacity: isApproved ? 0.7 : 1
                  }}
                >
                  {isApproved ? 'Approved' : 'Approve'}
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 px-3"
                  onClick={handleReject}
                  disabled={!isApproved}
                  style={{ 
                    background: 'var(--c-palUiRed600)', 
                    color: 'white',
                    opacity: !isApproved ? 0.5 : 1
                  }}
                >
                  Reject
                </Button>
              </>
            )}
            
            {/* Auditor Change Request button */}
            {user?.role === 'auditor' && (
              <Button 
                size="sm" 
                className="h-8 px-3"
                onClick={() => setShowChangeRequestDialog(true)}
                style={{ 
                  background: 'var(--c-palUiOra600)', 
                  color: 'white' 
                }}
              >
                Change Request
              </Button>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 h-8"
            style={{ color: 'var(--c-palUiRed600)' }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Auditor Section */}
          <Card style={{ borderColor: 'var(--c-borPri)', background: 'var(--c-bacSec)' }}>
            <CardHeader 
              className="border-b h-14 flex items-center"
              style={{ borderColor: 'var(--c-borPri)' }}
            >
              <div>
                <h2 className="text-base mb-0" style={{ color: 'var(--c-texPri)' }}>
                  Auditor Section
                </h2>
                <p className="text-xs leading-tight" style={{ color: 'var(--c-texSec)' }}>
                  Information captured by auditors during the audit process
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Observation Text */}
              <div className="space-y-1.5">
                <Label htmlFor="observationText" className="text-xs">
                  Observation Text <span style={{ color: 'var(--c-palUiRed600)' }}>*</span>
                </Label>
                <Textarea 
                  id="observationText"
                  value={observationText}
                  onChange={(e) => setObservationText(e.target.value)}
                  className="min-h-20 resize-none text-sm"
                  style={{ 
                    background: 'white',
                    border: '1px solid var(--c-borPri)',
                  }}
                />
              </div>

              {/* Risks Involved */}
              <div className="space-y-1.5">
                <Label htmlFor="risksInvolved" className="text-xs">Risks Involved</Label>
                <Textarea 
                  id="risksInvolved"
                  value={risksInvolved}
                  onChange={(e) => setRisksInvolved(e.target.value)}
                  className="min-h-16 resize-none text-sm"
                  placeholder="Describe potential risks..."
                  style={{ 
                    background: 'white',
                    border: '1px solid var(--c-borPri)',
                  }}
                />
              </div>

              {/* Risk Category & Likely Impact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="riskCategory" className="text-xs">Risk Category</Label>
                  <Select value={riskCategory} onValueChange={setRiskCategory}>
                    <SelectTrigger 
                      id="riskCategory"
                      className="h-9 text-sm"
                      style={{ 
                        background: 'white',
                        border: '1px solid var(--c-borPri)'
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Critical</SelectItem>
                      <SelectItem value="B">B - High</SelectItem>
                      <SelectItem value="C">C - Medium</SelectItem>
                      <SelectItem value="D">D - Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="likelyImpact" className="text-xs">Likely Impact</Label>
                  <Select value={likelyImpact} onValueChange={setLikelyImpact}>
                    <SelectTrigger 
                      id="likelyImpact"
                      className="h-9 text-sm"
                      style={{ 
                        background: 'white',
                        border: '1px solid var(--c-borPri)'
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Site-specific">Site-specific</SelectItem>
                      <SelectItem value="Org-wide">Org-wide</SelectItem>
                      <SelectItem value="Regional">Regional</SelectItem>
                      <SelectItem value="Global">Global</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Concerned Process & Auditor Person */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="concernedProcess" className="text-xs">Concerned Process</Label>
                  <Select value={concernedProcess} onValueChange={setConcernedProcess}>
                    <SelectTrigger 
                      id="concernedProcess"
                      className="h-9 text-sm"
                      style={{ 
                        background: 'white',
                        border: '1px solid var(--c-borPri)'
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R2R">R2R - Record to Report</SelectItem>
                      <SelectItem value="P2P">P2P - Procure to Pay</SelectItem>
                      <SelectItem value="O2C">O2C - Order to Cash</SelectItem>
                      <SelectItem value="HR">HR - Human Resources</SelectItem>
                      <SelectItem value="IT">IT - Information Technology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auditorPerson" className="text-xs">Auditor</Label>
                  <Select value={auditorPerson} onValueChange={setAuditorPerson}>
                    <SelectTrigger 
                      id="auditorPerson"
                      className="h-9 text-sm"
                      style={{ 
                        background: 'white',
                        border: '1px solid var(--c-borPri)'
                      }}
                    >
                      <SelectValue placeholder="Select auditor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="John Doe">John Doe</SelectItem>
                      <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                      <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
                      <SelectItem value="Sarah Williams">Sarah Williams</SelectItem>
                      <SelectItem value="Tom Brown">Tom Brown</SelectItem>
                      <SelectItem value="Alice Cooper">Alice Cooper</SelectItem>
                      <SelectItem value="Bob Wilson">Bob Wilson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Auditees */}
              <div className="space-y-2">
                <Label className="text-xs">Assigned Auditees</Label>
                {assignedAuditees.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {assignedAuditees.map((auditee) => (
                      <div
                        key={auditee}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs"
                        style={{
                          background: 'var(--c-palUiBlu100)',
                          color: 'var(--c-palUiBlu700)',
                          border: '1px solid var(--c-palUiBlu200)'
                        }}
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarFallback 
                            className="text-xs"
                            style={{ background: 'var(--c-palUiBlu200)', color: 'var(--c-palUiBlu700)', fontSize: '8px' }}
                          >
                            {getInitials(auditee)}
                          </AvatarFallback>
                        </Avatar>
                        {auditee}
                        <button
                          onClick={() => removeAuditee(auditee)}
                          className="hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter auditee name..."
                    value={newAuditee}
                    onChange={(e) => setNewAuditee(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addAuditee()}
                    className="h-9 text-sm"
                    style={{ 
                      background: 'white',
                      border: '1px solid var(--c-borPri)'
                    }}
                  />
                  <Button
                    onClick={addAuditee}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-9"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Auditor Response */}
              <div className="space-y-1.5">
                <Label htmlFor="auditorResponse" className="text-xs">Auditor Response to Auditee Remarks</Label>
                <Textarea 
                  id="auditorResponse"
                  value={auditorResponse}
                  onChange={(e) => setAuditorResponse(e.target.value)}
                  className="min-h-16 resize-none text-sm"
                  placeholder="Enter response to auditee feedback..."
                  style={{ 
                    background: 'white',
                    border: '1px solid var(--c-borPri)',
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auditee Section */}
          <Card style={{ borderColor: 'var(--c-borPri)', background: 'var(--c-bacSec)' }}>
            <CardHeader 
              className="border-b h-14 flex items-center"
              style={{ borderColor: 'var(--c-borPri)' }}
            >
              <div>
                <h2 className="text-base mb-0" style={{ color: 'var(--c-texPri)' }}>
                  Auditee Section
                </h2>
                <p className="text-xs leading-tight" style={{ color: 'var(--c-texSec)' }}>
                  Response and action plans from assigned auditees
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Auditee Persons */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="auditeePerson1" className="text-xs">Auditee Person (Tier 1)</Label>
                  <Input 
                    id="auditeePerson1"
                    value={auditeePerson1}
                    onChange={(e) => setAuditeePerson1(e.target.value)}
                    className="h-9 text-sm"
                    style={{ 
                      background: 'white',
                      border: '1px solid var(--c-borPri)'
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auditeePerson2" className="text-xs">Auditee Person (Tier 2)</Label>
                  <Input 
                    id="auditeePerson2"
                    value={auditeePerson2}
                    onChange={(e) => setAuditeePerson2(e.target.value)}
                    className="h-9 text-sm"
                    style={{ 
                      background: 'white',
                      border: '1px solid var(--c-borPri)'
                    }}
                  />
                </div>
              </div>

              {/* Auditee Feedback */}
              <div className="space-y-1.5">
                <Label htmlFor="auditeeFeedback" className="text-xs">Auditee Feedback</Label>
                <Textarea 
                  id="auditeeFeedback"
                  value={auditeeFeedback}
                  onChange={(e) => setAuditeeFeedback(e.target.value)}
                  className="min-h-16 resize-none text-sm"
                  placeholder="Enter your feedback and proposed actions..."
                  style={{ 
                    background: 'white',
                    border: '1px solid var(--c-borPri)',
                  }}
                />
              </div>

              {/* Action Plans */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Action Plans</Label>
                  {!showAddPlan && (
                    <Button
                      onClick={() => setShowAddPlan(true)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Plan
                    </Button>
                  )}
                </div>

                {/* Existing Action Plans */}
                {actionPlans.length > 0 && (
                  <div className="space-y-2">
                    {actionPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-3 rounded-lg border"
                        style={{
                          background: 'white',
                          borderColor: 'var(--c-borPri)'
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={plan.status === 'completed'}
                            onChange={() => togglePlanStatus(plan.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1.5">
                            <p
                              className="text-sm"
                              style={{
                                color: 'var(--c-texPri)',
                                textDecoration: plan.status === 'completed' ? 'line-through' : 'none',
                                opacity: plan.status === 'completed' ? 0.6 : 1
                              }}
                            >
                              {plan.plan}
                            </p>
                            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--c-texSec)' }}>
                              <span>Owner: {plan.owner}</span>
                              <span>Due: {new Date(plan.date).toLocaleDateString()}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-xs"
                                style={{
                                  background: plan.status === 'completed' ? 'var(--c-palUiGre100)' : 'var(--c-palUiOra100)',
                                  color: plan.status === 'completed' ? 'var(--c-palUiGre700)' : 'var(--c-palUiOra700)'
                                }}
                              >
                                {plan.status === 'completed' ? 'Completed' : 'Pending'}
                              </span>
                              {plan.retestStatus && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-xs"
                                  style={{
                                    background: plan.retestStatus === 'pass' ? 'var(--c-palUiGre100)' : 'var(--c-palUiRed100)',
                                    color: plan.retestStatus === 'pass' ? 'var(--c-palUiGre700)' : 'var(--c-palUiRed700)'
                                  }}
                                >
                                  Retest {plan.retestStatus === 'pass' ? 'Pass' : 'Fail'}
                                </span>
                              )}
                            </div>
                            {isAuditorOrHead && (
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  onClick={() => handleRetestPass(plan.id)}
                                  size="sm"
                                  className="h-7 gap-1.5"
                                  style={{ 
                                    background: plan.retestStatus === 'pass' ? 'var(--c-palUiGre600)' : 'transparent',
                                    color: plan.retestStatus === 'pass' ? 'white' : 'var(--c-palUiGre700)',
                                    border: '1px solid var(--c-palUiGre600)'
                                  }}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Retest Pass
                                </Button>
                                <Button
                                  onClick={() => handleRetestFail(plan.id)}
                                  size="sm"
                                  className="h-7 gap-1.5"
                                  style={{ 
                                    background: plan.retestStatus === 'fail' ? 'var(--c-palUiRed600)' : 'transparent',
                                    color: plan.retestStatus === 'fail' ? 'white' : 'var(--c-palUiRed700)',
                                    border: '1px solid var(--c-palUiRed600)'
                                  }}
                                >
                                  <XCircle className="h-3 w-3" />
                                  Retest Fail
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Plan Form */}
                {showAddPlan && (
                  <div
                    className="p-3 rounded-lg border space-y-2.5"
                    style={{
                      background: 'white',
                      borderColor: 'var(--c-borPri)'
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="newPlanText" className="text-xs">Plan Description</Label>
                      <Textarea
                        id="newPlanText"
                        value={newPlan.plan}
                        onChange={(e) => setNewPlan({ ...newPlan, plan: e.target.value })}
                        placeholder="Describe the action plan..."
                        className="min-h-14 resize-none text-sm"
                        style={{ 
                          background: 'white',
                          border: '1px solid var(--c-borPri)'
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="newPlanOwner" className="text-xs">Owner</Label>
                        <Input
                          id="newPlanOwner"
                          value={newPlan.owner}
                          onChange={(e) => setNewPlan({ ...newPlan, owner: e.target.value })}
                          placeholder="Plan owner..."
                          className="h-9 text-sm"
                          style={{ 
                            background: 'white',
                            border: '1px solid var(--c-borPri)'
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="newPlanDate" className="text-xs">Due Date</Label>
                        <Input
                          id="newPlanDate"
                          type="date"
                          value={newPlan.date}
                          onChange={(e) => setNewPlan({ ...newPlan, date: e.target.value })}
                          className="h-9 text-sm"
                          style={{ 
                            background: 'white',
                            border: '1px solid var(--c-borPri)'
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => {
                          setShowAddPlan(false);
                          setNewPlan({ plan: '', owner: '', date: '', status: 'pending' });
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={addActionPlan}
                        size="sm"
                        className="h-8"
                        style={{ background: 'var(--c-palUiBlu600)', color: 'white' }}
                      >
                        Add Plan
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments Section */}
          <Card style={{ borderColor: 'var(--c-borPri)', background: 'var(--c-bacSec)' }}>
            <CardHeader 
              className="border-b h-14 flex items-center"
              style={{ borderColor: 'var(--c-borPri)' }}
            >
              <div>
                <h2 className="text-base mb-0" style={{ color: 'var(--c-texPri)' }}>
                  Attachments
                </h2>
                <p className="text-xs leading-tight" style={{ color: 'var(--c-texSec)' }}>
                  Supporting documents and evidence
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Annexures */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Annexures</Label>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </Button>
                </div>
                {annexures.length > 0 ? (
                  <div className="space-y-2">
                    {annexures.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border"
                        style={{
                          background: 'white',
                          borderColor: 'var(--c-borPri)'
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="h-8 w-8 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--c-palUiBlu100)' }}
                          >
                            <FileText className="h-4 w-4" style={{ color: 'var(--c-palUiBlu600)' }} />
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--c-texPri)' }}>
                              {file.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                              {file.size} • Uploaded by {file.uploadedBy} on {file.uploadDate}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    className="text-center py-6 border rounded-lg" 
                    style={{ 
                      borderColor: 'var(--c-borPri)',
                      borderStyle: 'dashed'
                    }}
                  >
                    <p className="text-xs" style={{ color: 'var(--c-texTer)' }}>
                      No annexures uploaded yet
                    </p>
                  </div>
                )}
              </div>

              {/* Management Documents */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Management Documents</Label>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </Button>
                </div>
                {managementDocs.length > 0 ? (
                  <div className="space-y-2">
                    {managementDocs.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border"
                        style={{
                          background: 'white',
                          borderColor: 'var(--c-borPri)'
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="h-8 w-8 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--c-palUiGre100)' }}
                          >
                            <FileText className="h-4 w-4" style={{ color: 'var(--c-palUiGre600)' }} />
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--c-texPri)' }}>
                              {file.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                              {file.size} • Uploaded by {file.uploadedBy} on {file.uploadDate}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    className="text-center py-6 border rounded-lg" 
                    style={{ 
                      borderColor: 'var(--c-borPri)',
                      borderStyle: 'dashed'
                    }}
                  >
                    <p className="text-xs" style={{ color: 'var(--c-texTer)' }}>
                      No management documents uploaded yet
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & History */}
        <div className="space-y-4">
          {/* Running Notes Section */}
          <Card style={{ borderColor: 'var(--c-borPri)' }}>
            <CardHeader 
              className="border-b h-12 flex items-center"
              style={{ borderColor: 'var(--c-borPri)' }}
            >
              <h3 className="text-sm mb-0" style={{ color: 'var(--c-texPri)' }}>Running Notes</h3>
            </CardHeader>
            <CardContent className="space-y-3 p-3">
              {/* Messages/Notes */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {runningNotes.map((note) => (
                  <div key={note.id} className="space-y-1.5">
                    <div className="flex items-start gap-2.5">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback 
                          className="text-xs"
                          style={{ background: 'var(--c-palUiBlu100)', color: 'var(--c-palUiBlu600)', fontSize: '10px' }}
                        >
                          {getInitials(note.author)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs" style={{ color: 'var(--c-texPri)' }}>
                            {note.author}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                            {note.timestamp}
                          </span>
                        </div>
                        <div 
                          className="p-2.5 rounded-lg"
                          style={{ 
                            background: 'white',
                            border: '1px solid var(--c-borPri)'
                          }}
                        >
                          <p className="text-xs" style={{ color: 'var(--c-texPri)', lineHeight: '1.5' }}>
                            {note.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input area */}
              <div className="pt-2.5 border-t" style={{ borderColor: 'var(--c-borPri)' }}>
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback 
                      className="text-xs"
                      style={{ background: 'var(--c-palUiBlu100)', color: 'var(--c-palUiBlu600)', fontSize: '10px' }}
                    >
                      MJ
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={runningNote}
                      onChange={(e) => setRunningNote(e.target.value)}
                      className="min-h-16 resize-none text-xs flex-1"
                      style={{ 
                        background: 'white',
                        border: '1px solid var(--c-borPri)',
                      }}
                    />
                    <Button 
                      size="sm" 
                      className="h-8 w-8 p-0 self-end"
                      style={{ background: 'var(--c-palUiBlu600)', color: 'white' }}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Requests Section */}
          <Card style={{ borderColor: 'var(--c-borPri)' }}>
            <CardHeader 
              className="border-b h-12 flex items-center"
              style={{ borderColor: 'var(--c-borPri)' }}
            >
              <h3 className="text-sm mb-0" style={{ color: 'var(--c-texPri)' }}>Change Requests</h3>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {changeRequests.length > 0 ? (
                  changeRequests.map((request) => (
                    <div key={request.id} className="flex gap-2.5">
                      <div 
                        className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--c-palUiOra100)' }}
                      >
                        <Clock className="h-3.5 w-3.5" style={{ color: 'var(--c-palUiOra600)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs" style={{ color: 'var(--c-texPri)' }}>
                            {request.author}
                          </span>
                        </div>
                        <p className="text-xs mb-1.5" style={{ color: 'var(--c-texSec)' }}>
                          {request.timestamp}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--c-texPri)' }}>
                          {request.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs" style={{ color: 'var(--c-texTer)' }}>
                      No change requests
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Approval History Section */}
          <Card style={{ borderColor: 'var(--c-borPri)' }}>
            <CardHeader 
              className="border-b h-12 flex items-center"
              style={{ borderColor: 'var(--c-borPri)' }}
            >
              <h3 className="text-sm mb-0" style={{ color: 'var(--c-texPri)' }}>Approval History</h3>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {approvalHistory.length > 0 ? (
                  approvalHistory.map((item) => (
                    <div key={item.id} className="flex gap-2.5">
                      <div 
                        className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--c-palUiGre100)' }}
                      >
                        <Check className="h-3.5 w-3.5" style={{ color: 'var(--c-palUiGre600)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs" style={{ color: 'var(--c-texPri)' }}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs mb-1.5" style={{ color: 'var(--c-texSec)' }}>
                          {item.date}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--c-texPri)' }}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs" style={{ color: 'var(--c-texTer)' }}>
                      No approval history
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audit Trail Section */}
          <Card style={{ borderColor: 'var(--c-borPri)' }}>
            <CardHeader 
              className="border-b h-12 flex items-center"
              style={{ borderColor: 'var(--c-borPri)' }}
            >
              <h3 className="text-sm mb-0" style={{ color: 'var(--c-texPri)' }}>Audit Trail</h3>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {auditTrail.length > 0 ? (
                  auditTrail.map((item) => (
                    <div key={item.id} className="flex gap-2.5">
                      <div 
                        className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--c-palUiGra100)' }}
                      >
                        <Clock className="h-3.5 w-3.5" style={{ color: 'var(--c-palUiGra600)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs" style={{ color: 'var(--c-texPri)' }}>
                            {item.action}
                          </span>
                        </div>
                        <p className="text-xs mb-1.5" style={{ color: 'var(--c-texSec)' }}>
                          {item.date}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--c-texPri)' }}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs" style={{ color: 'var(--c-texTer)' }}>
                      No audit trail
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Request Dialog */}
      <Dialog open={showChangeRequestDialog} onOpenChange={setShowChangeRequestDialog}>
        <DialogContent style={{ background: 'white', borderColor: 'var(--c-borPri)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--c-texPri)' }}>Submit Change Request</DialogTitle>
            <DialogDescription style={{ color: 'var(--c-texSec)' }}>
              This observation is approved. To make changes, please submit a change request with a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <Label htmlFor="changeReason" className="text-xs">Reason for Change</Label>
              <Textarea
                id="changeReason"
                placeholder="Explain why you need to make changes to this approved observation..."
                value={changeRequestReason}
                onChange={(e) => setChangeRequestReason(e.target.value)}
                rows={4}
                style={{ 
                  background: 'white',
                  border: '1px solid var(--c-borPri)',
                  color: 'var(--c-texPri)'
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangeRequestDialog(false);
                setChangeRequestReason('');
              }}
              style={{ 
                border: '1px solid var(--c-borPri)',
                color: 'var(--c-texSec)'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeRequest}
              style={{ 
                background: 'var(--c-palUiOra600)', 
                color: 'white' 
              }}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
