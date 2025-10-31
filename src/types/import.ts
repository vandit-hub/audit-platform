export type SheetName = "Plants" | "Audits" | "Observations";

export type PlantRow = {
  code: string;
  name: string;
  _row: number; // 1-based row index in the sheet
};

export type AuditRow = {
  code: string;
  plant_code: string;
  title?: string;
  purpose?: string;
  visit_start_date?: string; // YYYY-MM-DD
  visit_end_date?: string; // YYYY-MM-DD
  status?: string; // AuditStatus enum string
  audit_head_email?: string;
  _row: number;
};

export type ObservationRow = {
  code: string;
  audit_code: string;
  plant_code: string;
  observation_text: string;
  risk_category?: string; // RiskCategory enum string
  likely_impact?: string; // LikelyImpact enum string
  concerned_process?: string; // Process enum string
  auditor_person?: string;
  auditee_person_tier1?: string;
  auditee_person_tier2?: string;
  auditee_feedback?: string;
  auditor_response_to_auditee?: string;
  target_date?: string; // YYYY-MM-DD
  person_responsible_to_implement?: string;
  current_status?: string; // ObservationStatus (create-only)
  implementation_date?: string; // YYYY-MM-DD
  re_test_result?: string; // ReTestResult enum string
  is_published?: string; // "true" | "false" (create-only)
  created_by_email?: string; // defaults to uploading CFO if missing
  _row: number;
};

export type ImportError = {
  sheet: SheetName;
  row: number; // 1-based
  column?: string;
  message: string;
};

export type PlannedAction = {
  sheet: SheetName;
  row: number;
  entityType: "PLANT" | "AUDIT" | "OBSERVATION";
  action: "create" | "update" | "skip" | "error";
  code: string;
};

export type DryRunResult = {
  ok: boolean;
  totals: { plants: number; audits: number; observations: number };
  actions: PlannedAction[];
  errors: ImportError[];
  summary: { create: number; update: number; skip: number; error: number };
};

export type ImportRunResult = DryRunResult & {
  dryRun: boolean;
};

export const EXPECTED_HEADERS = {
  Plants: ["code", "name"],
  Audits: [
    "code",
    "plant_code",
    "title",
    "purpose",
    "visit_start_date",
    "visit_end_date",
    "status",
    "audit_head_email"
  ],
  Observations: [
    "code",
    "audit_code",
    "plant_code",
    "observation_text",
    "risk_category",
    "likely_impact",
    "concerned_process",
    "auditor_person",
    "auditee_person_tier1",
    "auditee_person_tier2",
    "auditee_feedback",
    "auditor_response_to_auditee",
    "target_date",
    "person_responsible_to_implement",
    "current_status",
    "implementation_date",
    "re_test_result",
    "is_published",
    "created_by_email"
  ]
} as const;


