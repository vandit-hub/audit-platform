import { prisma } from "@/server/db";
import { writeAuditEvent } from "@/server/auditTrail";
import { parseExcelWorkbook } from "./excel";
import {
  DryRunResult,
  ImportError,
  PlannedAction,
  AuditRow,
  ObservationRow
} from "@/types/import";
import {
  AuditStatus,
  EntityType,
  LikelyImpact,
  ObservationStatus,
  Process,
  ReTestResult,
  RiskCategory
} from "@prisma/client";

function isYYYYMMDD(value?: string): boolean {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseAsDate(value?: string): Date | undefined {
  if (!value) return undefined;
  if (!isYYYYMMDD(value)) return undefined;
  // Interpret as UTC midnight to avoid TZ drift
  return new Date(`${value}T00:00:00.000Z`);
}

function isBoolText(value?: string): value is "true" | "false" {
  return value === "true" || value === "false";
}

function pushError(errors: ImportError[], sheet: ImportError["sheet"], row: number, column: string | undefined, message: string) {
  errors.push({ sheet, row, column, message });
}

function validateEnums(
  errors: ImportError[],
  row: ObservationRow | AuditRow,
  sheet: "Observations" | "Audits"
) {
  if (sheet === "Audits") {
    const ar = row as AuditRow;
    if (ar.status && !(ar.status in AuditStatus)) {
      pushError(errors, "Audits", ar._row, "status", `Invalid status '${ar.status}'`);
    }
  } else {
    const or = row as ObservationRow;
    if (or.risk_category && !(or.risk_category in RiskCategory)) {
      pushError(errors, "Observations", or._row, "risk_category", `Invalid risk_category '${or.risk_category}'`);
    }
    if (or.likely_impact && !(or.likely_impact in LikelyImpact)) {
      pushError(errors, "Observations", or._row, "likely_impact", `Invalid likely_impact '${or.likely_impact}'`);
    }
    if (or.concerned_process && !(or.concerned_process in Process)) {
      pushError(errors, "Observations", or._row, "concerned_process", `Invalid concerned_process '${or.concerned_process}'`);
    }
    if (or.current_status && !(or.current_status in ObservationStatus)) {
      pushError(errors, "Observations", or._row, "current_status", `Invalid current_status '${or.current_status}'`);
    }
    if (or.re_test_result && !(or.re_test_result in ReTestResult)) {
      pushError(errors, "Observations", or._row, "re_test_result", `Invalid re_test_result '${or.re_test_result}'`);
    }
  }
}

function validateDatesAndBooleans(errors: ImportError[], row: ObservationRow | AuditRow, sheet: "Observations" | "Audits") {
  if (sheet === "Audits") {
    const ar = row as AuditRow;
    if (ar.visit_start_date && !isYYYYMMDD(ar.visit_start_date)) {
      pushError(errors, "Audits", ar._row, "visit_start_date", "Invalid date format. Use YYYY-MM-DD");
    }
    if (ar.visit_end_date && !isYYYYMMDD(ar.visit_end_date)) {
      pushError(errors, "Audits", ar._row, "visit_end_date", "Invalid date format. Use YYYY-MM-DD");
    }
  } else {
    const or = row as ObservationRow;
    if (or.target_date && !isYYYYMMDD(or.target_date)) {
      pushError(errors, "Observations", or._row, "target_date", "Invalid date format. Use YYYY-MM-DD");
    }
    if (or.implementation_date && !isYYYYMMDD(or.implementation_date)) {
      pushError(errors, "Observations", or._row, "implementation_date", "Invalid date format. Use YYYY-MM-DD");
    }
    if (or.is_published && !isBoolText(or.is_published)) {
      pushError(errors, "Observations", or._row, "is_published", "Must be 'true' or 'false'");
    }
  }
}

function nonEmpty(value?: string) {
  return !!value && value.trim().length > 0;
}

export async function dryRunImport(buffer: Buffer): Promise<DryRunResult> {
  const { plants, audits, observations, errors } = parseExcelWorkbook(buffer);

  // Required columns
  for (const r of plants) {
    if (!nonEmpty(r.code)) pushError(errors, "Plants", r._row, "code", "code is required");
    if (!nonEmpty(r.name)) pushError(errors, "Plants", r._row, "name", "name is required");
  }
  for (const r of audits) {
    if (!nonEmpty(r.code)) pushError(errors, "Audits", r._row, "code", "code is required");
    if (!nonEmpty(r.plant_code)) pushError(errors, "Audits", r._row, "plant_code", "plant_code is required");
    validateEnums(errors, r, "Audits");
    validateDatesAndBooleans(errors, r, "Audits");
  }
  for (const r of observations) {
    if (!nonEmpty(r.code)) pushError(errors, "Observations", r._row, "code", "code is required");
    if (!nonEmpty(r.audit_code)) pushError(errors, "Observations", r._row, "audit_code", "audit_code is required");
    if (!nonEmpty(r.plant_code)) pushError(errors, "Observations", r._row, "plant_code", "plant_code is required");
    if (!nonEmpty(r.observation_text)) pushError(errors, "Observations", r._row, "observation_text", "observation_text is required");
    validateEnums(errors, r, "Observations");
    validateDatesAndBooleans(errors, r, "Observations");
    if (r.is_published && r.is_published !== "false") {
      pushError(errors, "Observations", r._row, "is_published", "Must be 'false' when provided during import");
    }
  }

  // Duplicates within sheet
  const dupCheck = (rows: { code: string; _row: number }[], sheet: DryRunResult["actions"][number]["sheet"]) => {
    const seen = new Map<string, number>();
    for (const r of rows) {
      if (!nonEmpty(r.code)) continue;
      const prev = seen.get(r.code);
      if (prev) {
        pushError(errors, sheet, r._row, "code", `Duplicate code also used in row ${prev}`);
      } else {
        seen.set(r.code, r._row);
      }
    }
  };
  dupCheck(plants, "Plants");
  dupCheck(audits, "Audits");
  dupCheck(observations, "Observations");

  // DB state for action planning and FK validation
  const [dbPlants, dbAudits, dbObservations, dbUsers] = await Promise.all([
    prisma.plant.findMany({ select: { id: true, code: true } }),
    prisma.audit.findMany({ select: { id: true, code: true, plantId: true } }),
    prisma.observation.findMany({ select: { id: true, code: true, auditId: true, plantId: true } }),
    prisma.user.findMany({ select: { id: true, email: true, role: true } })
  ]);

  const plantByCode = new Map(dbPlants.map((p) => [p.code, p] as const));
  const auditByCode = new Map(dbAudits.map((a) => [a.code ?? "", a] as const));
  const obsByCode = new Map(dbObservations.map((o) => [o.code ?? "", o] as const));
  const userByEmail = new Map(dbUsers.map((u) => [u.email.toLowerCase(), u] as const));

  // Pre-apply sheet plants and audits to support cross-sheet refs
  const sheetPlantCodes = new Set(plants.filter((p) => nonEmpty(p.code)).map((p) => p.code));
  const sheetAuditCodes = new Set(audits.filter((a) => nonEmpty(a.code)).map((a) => a.code));

  // FK and cross-checks
  for (const a of audits) {
    if (!a.plant_code) continue; // already reported required above
    const existsInSheet = sheetPlantCodes.has(a.plant_code);
    const existsInDb = !!plantByCode.get(a.plant_code);
    if (!existsInSheet && !existsInDb) {
      pushError(errors, "Audits", a._row, "plant_code", `Unknown plant_code '${a.plant_code}'`);
    }
    if (a.audit_head_email) {
      // If provided, must exist and be AUDIT_HEAD
      const u = userByEmail.get(a.audit_head_email.toLowerCase());
      if (!u) {
        pushError(errors, "Audits", a._row, "audit_head_email", `User not found: '${a.audit_head_email}'`);
      } else if (u.role !== "AUDIT_HEAD") {
        pushError(errors, "Audits", a._row, "audit_head_email", `User must have role AUDIT_HEAD`);
      }
    }
  }

  for (const o of observations) {
    const auditExists = sheetAuditCodes.has(o.audit_code) || !!auditByCode.get(o.audit_code);
    if (!auditExists) {
      pushError(errors, "Observations", o._row, "audit_code", `Unknown audit_code '${o.audit_code}'`);
    }
    const plantExists = sheetPlantCodes.has(o.plant_code) || !!plantByCode.get(o.plant_code);
    if (!plantExists) {
      pushError(errors, "Observations", o._row, "plant_code", `Unknown plant_code '${o.plant_code}'`);
    }
    if (o.created_by_email) {
      const u = userByEmail.get(o.created_by_email.toLowerCase());
      if (!u) pushError(errors, "Observations", o._row, "created_by_email", `User not found: '${o.created_by_email}'`);
    }

    // Cross-check audit.plant_code == o.plant_code when resolvable
    const sheetAudit = audits.find((a) => a.code === o.audit_code);
    if (sheetAudit && sheetAudit.plant_code && o.plant_code && sheetAudit.plant_code !== o.plant_code) {
      pushError(
        errors,
        "Observations",
        o._row,
        "plant_code",
        `Plant mismatch: audit '${o.audit_code}' is for plant '${sheetAudit.plant_code}'`
      );
    } else if (!sheetAudit) {
      const dbAudit = auditByCode.get(o.audit_code);
      if (dbAudit) {
        const dbAuditPlant = Array.from(plantByCode.values()).find((p) => p.id === dbAudit.plantId);
        if (dbAuditPlant && dbAuditPlant.code !== o.plant_code) {
          pushError(
            errors,
            "Observations",
            o._row,
            "plant_code",
            `Plant mismatch: audit '${o.audit_code}' is for plant '${dbAuditPlant.code}'`
          );
        }
      }
    }
  }

  // Plan actions
  const actions: PlannedAction[] = [];
  const planRow = (
    sheet: PlannedAction["sheet"],
    entityType: PlannedAction["entityType"],
    code: string,
    exists: boolean,
    row: number
  ) => {
    actions.push({ sheet, entityType, code, row, action: exists ? "update" : "create" });
  };

  for (const r of plants) {
    if (nonEmpty(r.code)) planRow("Plants", "PLANT", r.code, !!plantByCode.get(r.code), r._row);
  }
  for (const r of audits) {
    if (nonEmpty(r.code)) planRow("Audits", "AUDIT", r.code, !!auditByCode.get(r.code), r._row);
  }
  for (const r of observations) {
    if (nonEmpty(r.code)) planRow("Observations", "OBSERVATION", r.code, !!obsByCode.get(r.code), r._row);
  }

  // Any error -> keep ok=false but still return actions
  const summary = actions.reduce(
    (acc, a) => {
      acc[a.action]++;
      return acc;
    },
    { create: 0, update: 0, skip: 0, error: 0 }
  );

  const result: DryRunResult = {
    ok: errors.length === 0,
    totals: { plants: plants.length, audits: audits.length, observations: observations.length },
    actions,
    errors,
    summary
  };

  return result;
}

export async function runImport(buffer: Buffer, uploaderUserId: string, dryRun: boolean) {
  const dry = await dryRunImport(buffer);
  if (dryRun || !dry.ok) {
    return { ...dry, dryRun: true } as DryRunResult & { dryRun: boolean };
  }

  const { plants, audits, observations } = parseExcelWorkbook(buffer);

  // Load DB caches fresh for ids
  const [dbPlants, dbAudits, dbUsers] = await Promise.all([
    prisma.plant.findMany({ select: { id: true, code: true } }),
    prisma.audit.findMany({ select: { id: true, code: true, plantId: true } }),
    prisma.user.findMany({ select: { id: true, email: true, role: true } })
  ]);

  const plantByCode = new Map(dbPlants.map((p) => [p.code, p] as const));
  const auditByCode = new Map(dbAudits.map((a) => [a.code ?? "", a] as const));
  const userByEmail = new Map(dbUsers.map((u) => [u.email.toLowerCase(), u] as const));

  const createOrUpdatePlants = async () => {
    for (const r of plants) {
      if (!nonEmpty(r.code) || !nonEmpty(r.name)) continue;
      const exists = plantByCode.get(r.code);
      const rec = await prisma.plant.upsert({
        where: { code: r.code },
        update: { name: r.name },
        create: { code: r.code, name: r.name }
      });
      plantByCode.set(r.code, rec);
      await writeAuditEvent({
        entityType: EntityType.PLANT,
        entityId: rec.id,
        action: exists ? "IMPORT_UPDATE" : "IMPORT_CREATE",
        diff: { code: r.code, name: r.name },
        actorId: uploaderUserId
      });
    }
  };

  const createOrUpdateAudits = async () => {
    for (const r of audits) {
      if (!nonEmpty(r.code) || !nonEmpty(r.plant_code)) continue;
      const plant = plantByCode.get(r.plant_code) ?? (await prisma.plant.findUnique({ where: { code: r.plant_code } }));
      if (!plant) continue; // should have been validated

      const visitStart = parseAsDate(r.visit_start_date);
      const visitEnd = parseAsDate(r.visit_end_date);
      const status = r.status && r.status in AuditStatus ? (r.status as AuditStatus) : AuditStatus.PLANNED;

      const auditHeadId = r.audit_head_email
        ? userByEmail.get(r.audit_head_email.toLowerCase())?.id
        : undefined;

      const exists = auditByCode.get(r.code);
      const rec = await prisma.audit.upsert({
        where: { code: r.code },
        update: {
          plantId: plant.id,
          title: r.title ?? null,
          purpose: r.purpose ?? null,
          visitStartDate: visitStart ?? null,
          visitEndDate: visitEnd ?? null,
          status,
          auditHeadId: auditHeadId ?? null
        },
        create: {
          code: r.code,
          plantId: plant.id,
          title: r.title ?? null,
          purpose: r.purpose ?? null,
          visitStartDate: visitStart ?? null,
          visitEndDate: visitEnd ?? null,
          status,
          auditHeadId: auditHeadId ?? null,
          createdById: uploaderUserId
        }
      });
      auditByCode.set(r.code, rec);
      await writeAuditEvent({
        entityType: EntityType.AUDIT,
        entityId: rec.id,
        action: exists ? "IMPORT_UPDATE" : "IMPORT_CREATE",
        diff: { code: r.code },
        actorId: uploaderUserId
      });
    }
  };

  const createOrUpdateObservations = async () => {
    for (const r of observations) {
      if (!nonEmpty(r.code) || !nonEmpty(r.audit_code) || !nonEmpty(r.plant_code) || !nonEmpty(r.observation_text)) continue;
      const plant = plantByCode.get(r.plant_code) ?? (await prisma.plant.findUnique({ where: { code: r.plant_code } }));
      const audit = auditByCode.get(r.audit_code) ?? (await prisma.audit.findUnique({ where: { code: r.audit_code } }));
      if (!plant || !audit) continue; // should have been validated

      // cross-check audit's plant
      if (audit.plantId !== plant.id) {
        // skip inconsistent rows (should have been validated in dry run)
        continue;
      }

      const createdById = r.created_by_email
        ? userByEmail.get(r.created_by_email.toLowerCase())?.id ?? uploaderUserId
        : uploaderUserId;

      const dataBase = {
        auditId: audit.id,
        plantId: plant.id,
        observationText: r.observation_text,
        riskCategory: r.risk_category && r.risk_category in RiskCategory ? (r.risk_category as RiskCategory) : undefined,
        likelyImpact: r.likely_impact && r.likely_impact in LikelyImpact ? (r.likely_impact as LikelyImpact) : undefined,
        concernedProcess: r.concerned_process && r.concerned_process in Process ? (r.concerned_process as Process) : undefined,
        auditorPerson: r.auditor_person || undefined,
        auditeePersonTier1: r.auditee_person_tier1 || undefined,
        auditeePersonTier2: r.auditee_person_tier2 || undefined,
        auditeeFeedback: r.auditee_feedback || undefined,
        auditorResponseToAuditee: r.auditor_response_to_auditee || undefined,
        targetDate: parseAsDate(r.target_date) ?? undefined,
        personResponsibleToImplement: r.person_responsible_to_implement || undefined,
        currentStatus: r.current_status && r.current_status in ObservationStatus ? (r.current_status as ObservationStatus) : undefined,
        implementationDate: parseAsDate(r.implementation_date) ?? undefined,
        reTestResult: r.re_test_result && r.re_test_result in ReTestResult ? (r.re_test_result as ReTestResult) : undefined
      } as const;

      const exists = await prisma.observation.findUnique({ where: { code: r.code } });

      if (exists) {
        // Update content-only fields; do not alter approvalStatus or isPublished
        const { currentStatus: _ignoreCurrentStatus, ...updateRest } = dataBase as any;
        const rec = await prisma.observation.update({
          where: { code: r.code },
          data: {
            ...updateRest,
            // keep these untouched on update
          }
        });
        await writeAuditEvent({
          entityType: EntityType.OBSERVATION,
          entityId: rec.id,
          action: "IMPORT_UPDATE",
          diff: { code: r.code },
          actorId: uploaderUserId
        });
      } else {
        const rec = await prisma.observation.create({
          data: {
            code: r.code,
            ...dataBase,
            createdById,
            approvalStatus: "DRAFT",
            currentStatus: dataBase.currentStatus ?? ObservationStatus.PENDING_MR,
            isPublished: false
          }
        });
        await writeAuditEvent({
          entityType: EntityType.OBSERVATION,
          entityId: rec.id,
          action: "IMPORT_CREATE",
          diff: { code: r.code },
          actorId: uploaderUserId
        });
      }
    }
  };

  // Execute in sequence to satisfy FKs
  await createOrUpdatePlants();
  await createOrUpdateAudits();
  await createOrUpdateObservations();

  const finalDry = await dryRunImport(buffer);
  return { ...finalDry, dryRun: false };
}


