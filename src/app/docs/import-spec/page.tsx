import { Card } from "@/components/ui/v2/card";

export const dynamic = "force-static";

export default function ImportSpecPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">CFO Data Import (Excel) – Upsert by Codes</h1>
          <p className="text-neutral-600">Import Plants, Audits, and Observations from Excel files</p>
        </div>

        <div className="space-y-6">
          <Card >
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Summary</h2>
            <ul className="space-y-2 list-disc list-inside text-neutral-700">
              <li>One .xlsx file, three sheets: <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">Plants</code>, <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">Audits</code>, <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">Observations</code></li>
              <li>CFO-only</li>
              <li>Idempotent upsert by <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">code</code> on all entities</li>
              <li>Dry-run validation + detailed error report</li>
              <li>Import order: Plants → Audits → Observations</li>
            </ul>
          </Card>

          <Card >
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">File Format (.xlsx)</h2>
            <ul className="space-y-2 list-disc list-inside text-neutral-700">
              <li>Sheets required: <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">Plants</code>, <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">Audits</code>, <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">Observations</code> (exact names)</li>
              <li>Dates: <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">YYYY-MM-DD</code> only</li>
              <li>Booleans: <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">true</code>/<code className="px-1.5 py-0.5 bg-neutral-100 rounded text-sm font-mono">false</code> only</li>
              <li>
                <span className="font-medium">Enums (UPPERCASE only):</span>
                <div className="mt-2 pl-6 space-y-1 text-sm">
                  <div><code className="px-1.5 py-0.5 bg-neutral-100 rounded font-mono">AuditStatus</code>: PLANNED | IN_PROGRESS | SUBMITTED | SIGNED_OFF</div>
                  <div><code className="px-1.5 py-0.5 bg-neutral-100 rounded font-mono">Process</code>: O2C | P2P | R2R | INVENTORY</div>
                  <div><code className="px-1.5 py-0.5 bg-neutral-100 rounded font-mono">RiskCategory</code>: A | B | C</div>
                  <div><code className="px-1.5 py-0.5 bg-neutral-100 rounded font-mono">LikelyImpact</code>: LOCAL | ORG_WIDE</div>
                  <div><code className="px-1.5 py-0.5 bg-neutral-100 rounded font-mono">ObservationStatus</code>: PENDING_MR | MR_UNDER_REVIEW | REFERRED_BACK | OBSERVATION_FINALISED | RESOLVED</div>
                  <div><code className="px-1.5 py-0.5 bg-neutral-100 rounded font-mono">ReTestResult</code>: PASS | FAIL</div>
                </div>
              </li>
            </ul>
          </Card>

          <Card >
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Sheets and Columns (Order Fixed)</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-neutral-800 mb-3">Plants</h3>
                <ol className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">code</span>
                    <span className="text-neutral-600">(required, unique)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">name</span>
                    <span className="text-neutral-600">(required)</span>
                  </li>
                </ol>
              </div>

              <div className="border-t border-neutral-200 pt-6">
                <h3 className="text-xl font-semibold text-neutral-800 mb-3">Audits</h3>
                <ol className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">code</span>
                    <span className="text-neutral-600">(required, unique)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">plant_code</span>
                    <span className="text-neutral-600">(required)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">title</span>
                    <span className="text-neutral-600">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">purpose</span>
                    <span className="text-neutral-600">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">visit_start_date</span>
                    <span className="text-neutral-600">(optional, date)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">visit_end_date</span>
                    <span className="text-neutral-600">(optional, date)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">status</span>
                    <span className="text-neutral-600">(optional; enum; default PLANNED)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">audit_head_email</span>
                    <span className="text-neutral-600">(optional; existing AUDIT_HEAD user)</span>
                  </li>
                </ol>
              </div>

              <div className="border-t border-neutral-200 pt-6">
                <h3 className="text-xl font-semibold text-neutral-800 mb-3">Observations</h3>
                <ol className="space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">code</span>
                    <span className="text-neutral-600">(required, unique)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">audit_code</span>
                    <span className="text-neutral-600">(required)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">plant_code</span>
                    <span className="text-neutral-600">(required)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">observation_text</span>
                    <span className="text-neutral-600">(required)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">risk_category</span>
                    <span className="text-neutral-600">(optional; enum)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">likely_impact</span>
                    <span className="text-neutral-600">(optional; enum)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">concerned_process</span>
                    <span className="text-neutral-600">(optional; enum)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">auditor_person</span>
                    <span className="text-neutral-600">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">auditee_person_tier1</span>
                    <span className="text-neutral-600">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">auditee_person_tier2</span>
                    <span className="text-neutral-600">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">auditee_feedback</span>
                    <span className="text-neutral-600">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">auditor_response_to_auditee</span>
                    <span className="text-neutral-600">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">target_date</span>
                    <span className="text-neutral-600">(optional, date)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">person_responsible_to_implement</span>
                    <span className="text-neutral-600">(optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">current_status</span>
                    <span className="text-neutral-600">(optional; enum; create-only; default PENDING_MR)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">implementation_date</span>
                    <span className="text-neutral-600">(optional, date)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">re_test_result</span>
                    <span className="text-neutral-600">(optional; enum)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">is_published</span>
                    <span className="text-neutral-600">(optional; boolean; create-only; must be false)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-medium text-neutral-700">created_by_email</span>
                    <span className="text-neutral-600">(optional; default uploader)</span>
                  </li>
                </ol>
              </div>
            </div>
          </Card>

          <Card >
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Behavior</h2>
            <ul className="space-y-2 list-disc list-inside text-neutral-700">
              <li>Upsert by code; create defaults: Audit.status = PLANNED, Observation.approvalStatus = DRAFT, Observation.currentStatus = PENDING_MR, Observation.isPublished = false</li>
              <li>On update, create-only fields are ignored</li>
              <li>Cross-check: observation.audit_code must belong to observation.plant_code</li>
            </ul>
          </Card>

          <Card >
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Validation</h2>
            <ul className="space-y-2 list-disc list-inside text-neutral-700">
              <li>Dry-run returns errors with sheet, row, column, message</li>
              <li>Hard validations: requireds, enums, dates, booleans, duplicates, FK existence</li>
            </ul>
          </Card>

          <Card >
            <p className="text-neutral-700">
              Download the template from{" "}
              <a href="/api/v1/import/template" className="text-primary-600 hover:text-primary-700 underline font-medium">
                /api/v1/import/template
              </a>
              .
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

