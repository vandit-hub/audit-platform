export type UserRole = 'cfo' | 'admin' | 'audit_head' | 'auditor' | 'auditee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Plant {
  id: string;
  code: string;
  name: string;
  createdAt: string;
}

export interface Audit {
  id: string;
  plantId: string;
  plantName: string;
  title: string;
  purpose: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  progress: number;
  auditHead: string;
  auditors: string[];
  visibility: 'public' | 'private';
}

export type ObservationStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Observation {
  id: string;
  auditId: string;
  auditTitle: string;
  plantId: string;
  plantName: string;
  observationText: string;
  process: string;
  riskLevel: RiskLevel;
  status: ObservationStatus;
  isApproved: boolean;
  isPublished: boolean;
  auditorNotes: string;
  auditeeResponse: string;
  assignedAuditees: string[];
  createdAt: string;
  dueDate: string;
}

export interface ActionPlan {
  id: string;
  observationId: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completedDate?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'annexure' | 'management_doc';
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

export interface Note {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  expiryDate: string;
  isAccepted: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Checklist {
  id: string;
  auditId: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  assignedTo: string;
  dueDate?: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  description: string;
  isCompleted: boolean;
  notes?: string;
  completedBy?: string;
  completedAt?: string;
}
