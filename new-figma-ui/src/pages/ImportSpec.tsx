import { PageContainer } from '../components/PageContainer';
import { PageTitle } from '../components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ImportSpecProps {
  onNavigate?: (page: string) => void;
}

export function ImportSpec({ onNavigate }: ImportSpecProps = {}) {

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onNavigate?.('admin')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>
      </div>

      <PageTitle 
        title="CFO Data Import Specification" 
        description="Excel import format and validation rules"
      />

      <Card style={{ borderColor: 'var(--c-borPri)' }}>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: 'var(--c-texPri)' }}>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: 'var(--c-texPri)' }}>
            <li>One <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>.xlsx</code> file, three sheets: Plants, Audits, Observations</li>
            <li>CFO-only</li>
            <li>Idempotent upsert by code on all entities</li>
            <li>Dry-run validation + detailed error report</li>
            <li>Import order: Plants → Audits → Observations</li>
          </ul>
        </CardContent>
      </Card>

      <Card style={{ borderColor: 'var(--c-borPri)' }}>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: 'var(--c-texPri)' }}>File Format (.xlsx)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--c-texPri)', fontWeight: 600 }}>Required sheets:</p>
            <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>
              <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>Plants</code>,{' '}
              <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>Audits</code>,{' '}
              <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>Observations</code>{' '}
              (exact names)
            </p>
          </div>
          
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--c-texPri)', fontWeight: 600 }}>Dates:</p>
            <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>YYYY-MM-DD only</p>
          </div>

          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--c-texPri)', fontWeight: 600 }}>Booleans:</p>
            <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>true/false only</p>
          </div>

          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--c-texPri)', fontWeight: 600 }}>Enums (UPPERCASE only):</p>
            <div className="space-y-1.5">
              <div className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                <span style={{ fontWeight: 500 }}>AuditStatus:</span> PLANNED | IN_PROGRESS | SUBMITTED | SIGNED_OFF
              </div>
              <div className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                <span style={{ fontWeight: 500 }}>Process:</span> O2C | P2P | R2R | INVENTORY
              </div>
              <div className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                <span style={{ fontWeight: 500 }}>RiskCategory:</span> A | B | C
              </div>
              <div className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                <span style={{ fontWeight: 500 }}>LikelyImpact:</span> LOCAL | ORG_WIDE
              </div>
              <div className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                <span style={{ fontWeight: 500 }}>ObservationStatus:</span> PENDING_MR | MR_UNDER_REVIEW | REFERRED_BACK | OBSERVATION_FINALISED | RESOLVED
              </div>
              <div className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                <span style={{ fontWeight: 500 }}>ReTestResult:</span> PASS | FAIL
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ borderColor: 'var(--c-borPri)' }}>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: 'var(--c-texPri)' }}>Sheets and Columns (Order Fixed)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plants */}
          <div>
            <h4 className="text-sm mb-3" style={{ color: 'var(--c-texPri)', fontWeight: 600 }}>Plants</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-32" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>code</code>
                <span style={{ color: 'var(--c-texSec)' }}>(required, unique)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-32" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>name</code>
                <span style={{ color: 'var(--c-texSec)' }}>(required)</span>
              </div>
            </div>
          </div>

          {/* Audits */}
          <div>
            <h4 className="text-sm mb-3" style={{ color: 'var(--c-texPri)', fontWeight: 600 }}>Audits</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>code</code>
                <span style={{ color: 'var(--c-texSec)' }}>(required, unique)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>plant_code</code>
                <span style={{ color: 'var(--c-texSec)' }}>(required)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>title</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>purpose</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>visit_start_date</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional, date)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>visit_end_date</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional, date)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>status</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional; enum; default PLANNED)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>audit_head_email</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional; existing AUDIT_HEAD user)</span>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div>
            <h4 className="text-sm mb-3" style={{ color: 'var(--c-texPri)', fontWeight: 600 }}>Observations</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>code</code>
                <span style={{ color: 'var(--c-texSec)' }}>(required, unique)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>audit_code</code>
                <span style={{ color: 'var(--c-texSec)' }}>(required)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>plant_code</code>
                <span style={{ color: 'var(--c-texSec)' }}>(required)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>observation_text</code>
                <span style={{ color: 'var(--c-texSec)' }}>(required)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>risk_category</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional; enum)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>likely_impact</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional; enum)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>concerned_process</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional; enum)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>auditor_person</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>auditee_person_tier1</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>auditee_person_tier2</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>auditee_feedback</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>auditor_response_to_auditee</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>target_date</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional, date)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>person_responsible_to_implement</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>current_status</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional; enum; create-only; default PENDING_MR)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>implementation_date</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional, date)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>re_test_result</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional; enum)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>is_published</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional; boolean; create-only; must be false)</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <code className="px-2 py-1 rounded min-w-64" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>created_by_email</code>
                <span style={{ color: 'var(--c-texSec)' }}>(optional; default uploader)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ borderColor: 'var(--c-borPri)' }}>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: 'var(--c-texPri)' }}>Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-disc list-inside space-y-1.5 text-sm" style={{ color: 'var(--c-texPri)' }}>
            <li>Upsert by code; create defaults:</li>
            <ul className="list-disc list-inside ml-6 mt-1.5 space-y-1" style={{ color: 'var(--c-texSec)' }}>
              <li>Audit.status = PLANNED</li>
              <li>Observation.approvalStatus = DRAFT</li>
              <li>Observation.currentStatus = PENDING_MR</li>
              <li>Observation.isPublished = false</li>
            </ul>
            <li>On update, create-only fields are ignored</li>
            <li>Cross-check: observation.audit_code must belong to observation.plant_code</li>
          </ul>
        </CardContent>
      </Card>

      <Card style={{ borderColor: 'var(--c-borPri)' }}>
        <CardHeader>
          <CardTitle className="text-base" style={{ color: 'var(--c-texPri)' }}>Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="list-disc list-inside space-y-1.5 text-sm" style={{ color: 'var(--c-texPri)' }}>
            <li>Dry-run returns errors with sheet, row, column, message</li>
            <li>Hard validations: requireds, enums, dates, booleans, duplicates, FK existence</li>
            <li>Download the template from <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--c-bacTer)', color: 'var(--c-texPri)' }}>/api/v1/import/template</code></li>
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
