-- Update default for Observation.currentStatus to PENDING_MR (requires prior enum addition)
ALTER TABLE "Observation" ALTER COLUMN "currentStatus" SET DEFAULT 'PENDING_MR'::"ObservationStatus";

-- OPTIONAL: migrate historical values from PENDING -> PENDING_MR for consistency
UPDATE "Observation" SET "currentStatus" = 'PENDING_MR'::"ObservationStatus" WHERE "currentStatus" = 'PENDING'::"ObservationStatus";

-- Update legacy ADMIN users to CFO where applicable
UPDATE "User" SET "role" = 'CFO'::"Role" WHERE "role" = 'ADMIN'::"Role";

-- Ensure ObservationAssignment table exists with correct relationships
CREATE TABLE IF NOT EXISTS "ObservationAssignment" (
  "id" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "auditeeId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedById" TEXT,
  CONSTRAINT "ObservationAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ObservationAssignment_auditeeId_idx" ON "ObservationAssignment"("auditeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "ObservationAssignment_observationId_auditeeId_key" ON "ObservationAssignment"("observationId", "auditeeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ObservationAssignment_observationId_fkey') THEN
    ALTER TABLE "ObservationAssignment" ADD CONSTRAINT "ObservationAssignment_observationId_fkey"
      FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ObservationAssignment_auditeeId_fkey') THEN
    ALTER TABLE "ObservationAssignment" ADD CONSTRAINT "ObservationAssignment_auditeeId_fkey"
      FOREIGN KEY ("auditeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ObservationAssignment_assignedById_fkey') THEN
    ALTER TABLE "ObservationAssignment" ADD CONSTRAINT "ObservationAssignment_assignedById_fkey"
      FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add auditorResponseToAuditee column if missing
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "auditorResponseToAuditee" TEXT;

-- Add retest column to ActionPlan if missing (enum created in previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'ActionPlan' AND column_name = 'retest'
  ) THEN
    ALTER TABLE "ActionPlan" ADD COLUMN "retest" "ActionPlanRetest";
  END IF;
END $$;

