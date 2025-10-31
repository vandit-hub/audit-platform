export const dynamic = "force-static";

export default function ImportSpecPage() {
  return (
    <div className="prose max-w-none p-6">
      <h1>CFO Data Import (Excel) – Upsert by Codes</h1>
      <h3>Summary</h3>
      <ul>
        <li>One .xlsx file, three sheets: <code>Plants</code>, <code>Audits</code>, <code>Observations</code></li>
        <li>CFO-only</li>
        <li>Idempotent upsert by <code>code</code> on all entities</li>
        <li>Dry-run validation + detailed error report</li>
        <li>Import order: Plants → Audits → Observations</li>
      </ul>

      <h3>File format (.xlsx)</h3>
      <ul>
        <li>Sheets required: <code>Plants</code>, <code>Audits</code>, <code>Observations</code> (exact names)</li>
        <li>Dates: <code>YYYY-MM-DD</code> only</li>
        <li>Booleans: <code>true</code>/<code>false</code> only</li>
        <li>Enums (UPPERCASE only): AuditStatus: PLANNED | IN_PROGRESS | SUBMITTED | SIGNED_OFF; Process: O2C | P2P | R2R | INVENTORY; RiskCategory: A | B | C; LikelyImpact: LOCAL | ORG_WIDE; ObservationStatus: PENDING_MR | MR_UNDER_REVIEW | REFERRED_BACK | OBSERVATION_FINALISED | RESOLVED; ReTestResult: PASS | FAIL</li>
      </ul>

      <h3>Sheets and columns (order fixed)</h3>
      <h4>Plants</h4>
      <ol>
        <li><code>code</code> (required, unique)</li>
        <li><code>name</code> (required)</li>
      </ol>

      <h4>Audits</h4>
      <ol>
        <li><code>code</code> (required, unique)</li>
        <li><code>plant_code</code> (required)</li>
        <li><code>title</code> (optional)</li>
        <li><code>purpose</code> (optional)</li>
        <li><code>visit_start_date</code> (optional, date)</li>
        <li><code>visit_end_date</code> (optional, date)</li>
        <li><code>status</code> (optional; enum; default PLANNED)</li>
        <li><code>audit_head_email</code> (optional; existing AUDIT_HEAD user)</li>
      </ol>

      <h4>Observations</h4>
      <ol>
        <li><code>code</code> (required, unique)</li>
        <li><code>audit_code</code> (required)</li>
        <li><code>plant_code</code> (required)</li>
        <li><code>observation_text</code> (required)</li>
        <li><code>risk_category</code> (optional; enum)</li>
        <li><code>likely_impact</code> (optional; enum)</li>
        <li><code>concerned_process</code> (optional; enum)</li>
        <li><code>auditor_person</code> (optional)</li>
        <li><code>auditee_person_tier1</code> (optional)</li>
        <li><code>auditee_person_tier2</code> (optional)</li>
        <li><code>auditee_feedback</code> (optional)</li>
        <li><code>auditor_response_to_auditee</code> (optional)</li>
        <li><code>target_date</code> (optional, date)</li>
        <li><code>person_responsible_to_implement</code> (optional)</li>
        <li><code>current_status</code> (optional; enum; create-only; default PENDING_MR)</li>
        <li><code>implementation_date</code> (optional, date)</li>
        <li><code>re_test_result</code> (optional; enum)</li>
        <li><code>is_published</code> (optional; boolean; create-only; must be false)</li>
        <li><code>created_by_email</code> (optional; default uploader)</li>
      </ol>

      <h3>Behavior</h3>
      <ul>
        <li>Upsert by code; create defaults: Audit.status = PLANNED, Observation.approvalStatus = DRAFT, Observation.currentStatus = PENDING_MR, Observation.isPublished = false</li>
        <li>On update, create-only fields are ignored</li>
        <li>Cross-check: observation.audit_code must belong to observation.plant_code</li>
      </ul>

      <h3>Validation</h3>
      <ul>
        <li>Dry-run returns errors with sheet, row, column, message</li>
        <li>Hard validations: requireds, enums, dates, booleans, duplicates, FK existence</li>
      </ul>

      <p>
        Download the template from <a href="/api/v1/import/template">/api/v1/import/template</a>.
      </p>
    </div>
  );
}


