import * as XLSX from "xlsx";
import {
  EXPECTED_HEADERS,
  ImportError,
  PlantRow,
  AuditRow,
  ObservationRow
} from "@/types/import";

function normalizeHeader(header: unknown): string {
  return String(header ?? "").trim();
}

function headersEqual(actual: unknown[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (normalizeHeader(actual[i]) !== expected[i]) return false;
  }
  return true;
}

function readSheet(workbook: XLSX.WorkBook, name: string): XLSX.WorkSheet | null {
  const ws = workbook.Sheets[name];
  return ws || null;
}

function sheetToRows(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as unknown[][];
}

export function parseExcelWorkbook(buffer: Buffer): {
  plants: PlantRow[];
  audits: AuditRow[];
  observations: ObservationRow[];
  errors: ImportError[];
} {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const errors: ImportError[] = [];

  const plantsSheet = readSheet(wb, "Plants");
  const auditsSheet = readSheet(wb, "Audits");
  const observationsSheet = readSheet(wb, "Observations");

  if (!plantsSheet) {
    errors.push({ sheet: "Plants", row: 1, message: "Missing sheet 'Plants'" });
  }
  if (!auditsSheet) {
    errors.push({ sheet: "Audits", row: 1, message: "Missing sheet 'Audits'" });
  }
  if (!observationsSheet) {
    errors.push({ sheet: "Observations", row: 1, message: "Missing sheet 'Observations'" });
  }

  const plants: PlantRow[] = [];
  const audits: AuditRow[] = [];
  const observations: ObservationRow[] = [];

  if (plantsSheet) {
    const rows = sheetToRows(plantsSheet);
    const header = (rows[0] ?? []) as unknown[];
    if (!headersEqual(header, EXPECTED_HEADERS.Plants)) {
      errors.push({
        sheet: "Plants",
        row: 1,
        message: `Header mismatch. Expected: ${EXPECTED_HEADERS.Plants.join(", ")}`
      });
    } else {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i] ?? [];
        if (!r || (r as any[]).every((c) => String(c ?? "").trim() === "")) continue; // skip blank
        plants.push({
          code: String(r[0] ?? "").trim(),
          name: String(r[1] ?? "").trim(),
          _row: i + 1
        });
      }
    }
  }

  if (auditsSheet) {
    const rows = sheetToRows(auditsSheet);
    const header = (rows[0] ?? []) as unknown[];
    if (!headersEqual(header, EXPECTED_HEADERS.Audits)) {
      errors.push({
        sheet: "Audits",
        row: 1,
        message: `Header mismatch. Expected: ${EXPECTED_HEADERS.Audits.join(", ")}`
      });
    } else {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i] ?? [];
        if (!r || (r as any[]).every((c) => String(c ?? "").trim() === "")) continue;
        audits.push({
          code: String(r[0] ?? "").trim(),
          plant_code: String(r[1] ?? "").trim(),
          title: String(r[2] ?? "").trim() || undefined,
          purpose: String(r[3] ?? "").trim() || undefined,
          visit_start_date: String(r[4] ?? "").trim() || undefined,
          visit_end_date: String(r[5] ?? "").trim() || undefined,
          status: String(r[6] ?? "").trim() || undefined,
          audit_head_email: String(r[7] ?? "").trim() || undefined,
          _row: i + 1
        });
      }
    }
  }

  if (observationsSheet) {
    const rows = sheetToRows(observationsSheet);
    const header = (rows[0] ?? []) as unknown[];
    if (!headersEqual(header, EXPECTED_HEADERS.Observations)) {
      errors.push({
        sheet: "Observations",
        row: 1,
        message: `Header mismatch. Expected: ${EXPECTED_HEADERS.Observations.join(", ")}`
      });
    } else {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i] ?? [];
        if (!r || (r as any[]).every((c) => String(c ?? "").trim() === "")) continue;
        observations.push({
          code: String(r[0] ?? "").trim(),
          audit_code: String(r[1] ?? "").trim(),
          plant_code: String(r[2] ?? "").trim(),
          observation_text: String(r[3] ?? "").trim(),
          risk_category: String(r[4] ?? "").trim() || undefined,
          likely_impact: String(r[5] ?? "").trim() || undefined,
          concerned_process: String(r[6] ?? "").trim() || undefined,
          auditor_person: String(r[7] ?? "").trim() || undefined,
          auditee_person_tier1: String(r[8] ?? "").trim() || undefined,
          auditee_person_tier2: String(r[9] ?? "").trim() || undefined,
          auditee_feedback: String(r[10] ?? "").trim() || undefined,
          auditor_response_to_auditee: String(r[11] ?? "").trim() || undefined,
          target_date: String(r[12] ?? "").trim() || undefined,
          person_responsible_to_implement: String(r[13] ?? "").trim() || undefined,
          current_status: String(r[14] ?? "").trim() || undefined,
          implementation_date: String(r[15] ?? "").trim() || undefined,
          re_test_result: String(r[16] ?? "").trim() || undefined,
          is_published: String(r[17] ?? "").trim() || undefined,
          created_by_email: String(r[18] ?? "").trim() || undefined,
          _row: i + 1
        });
      }
    }
  }

  return { plants, audits, observations, errors };
}


