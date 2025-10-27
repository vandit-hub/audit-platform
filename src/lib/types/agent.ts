/**
 * Type definitions for AI Agent MVP
 */

// User context passed to MCP tools
export interface AgentUserContext {
  userId: string;
  role: string;
  email: string;
  name: string;
}

// Input types for MCP tools
export interface GetObservationsInput {
  auditId?: string;
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  riskCategory?: 'A' | 'B' | 'C';
  currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  limit?: number;
  // NEW Phase 2 filters
  plantId?: string;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  process?: 'O2C' | 'P2P' | 'R2R' | 'INVENTORY';
  published?: boolean;
  searchQuery?: string;
}

export interface GetObservationStatsInput {
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory' | 'concernedProcess' | 'auditId';
  auditId?: string;
}

// NEW Phase 2: Audit filters
export interface AuditFilters {
  plantId?: string;
  status?: 'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SIGNED_OFF';
  limit?: number;
}

// Response types
export interface ObservationSummary {
  id: string;
  observationText: string;
  riskCategory: string | null;
  concernedProcess: string | null;
  currentStatus: string;
  approvalStatus: string;
  isPublished: boolean;
  createdAt: string;
  audit: {
    id: string;
    title: string | null;
  };
  plant: {
    id: string;
    name: string;
  };
}

export interface StatResult {
  [key: string]: any;
  count: number;
}
