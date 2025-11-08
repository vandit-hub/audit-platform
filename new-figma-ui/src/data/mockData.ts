import { Plant, Audit, Observation, ActionPlan, Invite, Conversation } from '../types';

export const mockPlants: Plant[] = [
  { id: '1', code: 'PLT001', name: 'Manufacturing Plant A', createdAt: '2024-01-15' },
  { id: '2', code: 'PLT002', name: 'Distribution Center B', createdAt: '2024-02-20' },
  { id: '3', code: 'PLT003', name: 'Production Facility C', createdAt: '2024-03-10' },
  { id: '4', code: 'PLT004', name: 'Warehouse D', createdAt: '2024-04-05' }
];

export const mockAudits: Audit[] = [
  {
    id: '1',
    plantId: '1',
    plantName: 'Manufacturing Plant A',
    title: 'Q1 Safety Audit',
    purpose: 'Quarterly safety compliance review',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    isLocked: false,
    progress: 75,
    auditHead: 'John Doe',
    auditors: ['Jane Smith', 'Mike Johnson'],
    visibility: 'public'
  },
  {
    id: '2',
    plantId: '2',
    plantName: 'Distribution Center B',
    title: 'Annual Financial Audit',
    purpose: 'Annual financial compliance check',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    isLocked: true,
    progress: 45,
    auditHead: 'Sarah Williams',
    auditors: ['Tom Brown'],
    visibility: 'private'
  },
  {
    id: '3',
    plantId: '1',
    plantName: 'Manufacturing Plant A',
    title: 'Environmental Compliance',
    purpose: 'Environmental standards verification',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    isLocked: false,
    progress: 90,
    auditHead: 'John Doe',
    auditors: ['Jane Smith', 'Alice Cooper', 'Bob Wilson'],
    visibility: 'public'
  }
];

export const mockObservations: Observation[] = [
  {
    id: '1',
    auditId: '1',
    auditTitle: 'Q1 Safety Audit',
    plantId: '1',
    plantName: 'Manufacturing Plant A',
    observationText: 'Fire extinguishers missing inspection tags',
    process: 'Safety Equipment',
    riskLevel: 'high',
    status: 'in_progress',
    isApproved: true,
    isPublished: true,
    auditorNotes: 'Multiple fire extinguishers found without current inspection tags',
    auditeeResponse: 'Scheduling immediate inspection and tagging',
    assignedAuditees: ['Plant Manager', 'Safety Officer'],
    createdAt: '2024-02-15',
    dueDate: '2024-03-15'
  },
  {
    id: '2',
    auditId: '1',
    auditTitle: 'Q1 Safety Audit',
    plantId: '1',
    plantName: 'Manufacturing Plant A',
    observationText: 'Emergency exit signs not illuminated',
    process: 'Emergency Systems',
    riskLevel: 'critical',
    status: 'open',
    isApproved: true,
    isPublished: false,
    auditorNotes: 'Several emergency exit signs have non-functional lighting',
    auditeeResponse: '',
    assignedAuditees: ['Facilities Manager'],
    createdAt: '2024-02-16',
    dueDate: '2024-02-28'
  },
  {
    id: '3',
    auditId: '2',
    auditTitle: 'Annual Financial Audit',
    plantId: '2',
    plantName: 'Distribution Center B',
    observationText: 'Incomplete expense documentation',
    process: 'Financial Records',
    riskLevel: 'medium',
    status: 'resolved',
    isApproved: false,
    isPublished: false,
    auditorNotes: 'Missing receipts for several expense claims',
    auditeeResponse: 'All documentation has been gathered and filed',
    assignedAuditees: ['Accounting Manager'],
    createdAt: '2024-03-01',
    dueDate: '2024-04-01'
  },
  {
    id: '4',
    auditId: '3',
    auditTitle: 'Environmental Compliance',
    plantId: '1',
    plantName: 'Manufacturing Plant A',
    observationText: 'Waste segregation not properly implemented',
    process: 'Waste Management',
    riskLevel: 'low',
    status: 'closed',
    isApproved: true,
    isPublished: true,
    auditorNotes: 'Some areas showing mixed waste in segregated bins',
    auditeeResponse: 'Additional training provided and new signage installed',
    assignedAuditees: ['Environmental Officer'],
    createdAt: '2024-07-10',
    dueDate: '2024-08-10'
  }
];

export const mockActionPlans: ActionPlan[] = [
  {
    id: '1',
    observationId: '1',
    description: 'Schedule fire extinguisher inspections for all units',
    assignedTo: 'Safety Officer',
    dueDate: '2024-03-10',
    status: 'in_progress'
  },
  {
    id: '2',
    observationId: '1',
    description: 'Install new inspection tags on all extinguishers',
    assignedTo: 'Maintenance Team',
    dueDate: '2024-03-15',
    status: 'pending'
  },
  {
    id: '3',
    observationId: '2',
    description: 'Replace all non-functional emergency exit lights',
    assignedTo: 'Facilities Manager',
    dueDate: '2024-02-25',
    status: 'overdue'
  },
  {
    id: '4',
    observationId: '2',
    description: 'Test all emergency lighting systems',
    assignedTo: 'Electrical Team',
    dueDate: '2024-11-12',
    status: 'pending'
  },
  {
    id: '5',
    observationId: '3',
    description: 'Gather missing expense receipts',
    assignedTo: 'Accounting Manager',
    dueDate: '2024-03-25',
    status: 'completed',
    completedDate: '2024-03-20'
  }
];

export const mockInvites: Invite[] = [
  {
    id: '1',
    email: 'newuser@example.com',
    role: 'auditor',
    token: 'abc123xyz',
    expiryDate: '2024-12-31',
    isAccepted: false
  }
];

export const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'Safety Audit Questions',
    lastMessage: 'What are the key safety requirements?',
    updatedAt: '2024-11-05'
  },
  {
    id: '2',
    title: 'Report Generation Help',
    lastMessage: 'How do I export the audit report?',
    updatedAt: '2024-11-04'
  }
];
