-- AlterTable: Update Audit table with new fields
ALTER TABLE "Audit" 
  DROP COLUMN IF EXISTS "startDate",
  DROP COLUMN IF EXISTS "endDate",
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "purpose" TEXT,
  ADD COLUMN IF NOT EXISTS "visitStartDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "visitEndDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "managementResponseDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "finalPresentationDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedById" TEXT,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completedById" TEXT,
  ADD COLUMN IF NOT EXISTS "visibilityRules" JSONB,
  ADD COLUMN IF NOT EXISTS "auditHeadId" TEXT;

-- AddForeignKey (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Audit_auditHeadId_fkey'
  ) THEN
    ALTER TABLE "Audit" ADD CONSTRAINT "Audit_auditHeadId_fkey" 
      FOREIGN KEY ("auditHeadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

