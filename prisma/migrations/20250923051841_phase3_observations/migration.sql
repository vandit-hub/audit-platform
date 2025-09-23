-- CreateEnum
CREATE TYPE "public"."LikelyImpact" AS ENUM ('LOCAL', 'ORG_WIDE');

-- CreateEnum
CREATE TYPE "public"."ObservationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."ReTestResult" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AttachmentKind" AS ENUM ('ANNEXURE', 'MGMT_DOC');

-- CreateTable
CREATE TABLE "public"."Observation" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "observationText" TEXT NOT NULL,
    "risksInvolved" TEXT,
    "riskCategory" "public"."RiskCategory",
    "likelyImpact" "public"."LikelyImpact",
    "concernedProcess" "public"."Process",
    "auditorPerson" TEXT,
    "auditeePersonTier1" TEXT,
    "auditeePersonTier2" TEXT,
    "auditeeFeedback" TEXT,
    "hodActionPlan" TEXT,
    "targetDate" TIMESTAMP(3),
    "personResponsibleToImplement" TEXT,
    "currentStatus" "public"."ObservationStatus" NOT NULL DEFAULT 'PENDING',
    "implementationDate" TIMESTAMP(3),
    "reTestResult" "public"."ReTestResult",
    "approvalStatus" "public"."ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "lockedFields" JSONB,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ObservationAttachment" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "kind" "public"."AttachmentKind" NOT NULL,
    "key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObservationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Approval" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL,
    "comment" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RunningNote" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunningNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActionPlan" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "owner" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Observation_plantId_idx" ON "public"."Observation"("plantId");

-- CreateIndex
CREATE INDEX "Observation_approvalStatus_isPublished_idx" ON "public"."Observation"("approvalStatus", "isPublished");

-- CreateIndex
CREATE INDEX "Approval_observationId_status_idx" ON "public"."Approval"("observationId", "status");

-- CreateIndex
CREATE INDEX "RunningNote_observationId_createdAt_idx" ON "public"."RunningNote"("observationId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Observation" ADD CONSTRAINT "Observation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "public"."Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Observation" ADD CONSTRAINT "Observation_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "public"."Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Observation" ADD CONSTRAINT "Observation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ObservationAttachment" ADD CONSTRAINT "ObservationAttachment_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "public"."Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Approval" ADD CONSTRAINT "Approval_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "public"."Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Approval" ADD CONSTRAINT "Approval_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RunningNote" ADD CONSTRAINT "RunningNote_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "public"."Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RunningNote" ADD CONSTRAINT "RunningNote_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActionPlan" ADD CONSTRAINT "ActionPlan_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "public"."Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
