-- Add optional unique code columns to Audit and Observation

-- Audit.code
ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Audit_code_key" ON "Audit"("code");

-- Observation.code
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Observation_code_key" ON "Observation"("code");


