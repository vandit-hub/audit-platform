-- CreateEnum
CREATE TYPE "public"."AuditStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'SUBMITTED', 'SIGNED_OFF');

-- CreateEnum
CREATE TYPE "public"."Process" AS ENUM ('O2C', 'P2P', 'R2R', 'INVENTORY');

-- CreateEnum
CREATE TYPE "public"."RiskCategory" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "public"."ChecklistItemStatus" AS ENUM ('PENDING', 'DONE');

-- CreateTable
CREATE TABLE "public"."Audit" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "visitDetails" TEXT,
    "reportSubmittedAt" TIMESTAMP(3),
    "signOffAt" TIMESTAMP(3),
    "status" "public"."AuditStatus" NOT NULL DEFAULT 'PLANNED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditAssignment" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Checklist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "riskCategory" "public"."RiskCategory",
    "process" "public"."Process",
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChecklistApplicability" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,

    CONSTRAINT "ChecklistApplicability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditChecklist" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditChecklistItem" (
    "id" TEXT NOT NULL,
    "auditChecklistId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "public"."ChecklistItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditAssignment_auditId_auditorId_key" ON "public"."AuditAssignment"("auditId", "auditorId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistApplicability_checklistId_plantId_key" ON "public"."ChecklistApplicability"("checklistId", "plantId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditChecklist_auditId_checklistId_key" ON "public"."AuditChecklist"("auditId", "checklistId");

-- CreateIndex
CREATE INDEX "AuditChecklistItem_auditChecklistId_idx" ON "public"."AuditChecklistItem"("auditChecklistId");

-- AddForeignKey
ALTER TABLE "public"."Audit" ADD CONSTRAINT "Audit_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Audit" ADD CONSTRAINT "Audit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditAssignment" ADD CONSTRAINT "AuditAssignment_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditAssignment" ADD CONSTRAINT "AuditAssignment_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChecklistApplicability" ADD CONSTRAINT "ChecklistApplicability_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChecklistApplicability" ADD CONSTRAINT "ChecklistApplicability_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditChecklist" ADD CONSTRAINT "AuditChecklist_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditChecklist" ADD CONSTRAINT "AuditChecklist_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditChecklistItem" ADD CONSTRAINT "AuditChecklistItem_auditChecklistId_fkey" FOREIGN KEY ("auditChecklistId") REFERENCES "public"."AuditChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
