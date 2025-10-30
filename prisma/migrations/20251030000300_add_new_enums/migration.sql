-- Add missing Role enum values for RBAC v2
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CFO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'CFO';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CXO_TEAM' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'CXO_TEAM';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AUDIT_HEAD' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" ADD VALUE 'AUDIT_HEAD';
  END IF;
END $$;

-- Add new ObservationStatus enum values required by updated workflow
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_MR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ObservationStatus')) THEN
    ALTER TYPE "ObservationStatus" ADD VALUE 'PENDING_MR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MR_UNDER_REVIEW' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ObservationStatus')) THEN
    ALTER TYPE "ObservationStatus" ADD VALUE 'MR_UNDER_REVIEW';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REFERRED_BACK' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ObservationStatus')) THEN
    ALTER TYPE "ObservationStatus" ADD VALUE 'REFERRED_BACK';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OBSERVATION_FINALISED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ObservationStatus')) THEN
    ALTER TYPE "ObservationStatus" ADD VALUE 'OBSERVATION_FINALISED';
  END IF;
END $$;

-- Create ActionPlanRetest enum if it does not exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionPlanRetest') THEN
    CREATE TYPE "ActionPlanRetest" AS ENUM ('RETEST_DUE', 'PASS', 'FAIL');
  END IF;
END $$;

