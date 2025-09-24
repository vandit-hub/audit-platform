-- CreateEnum
CREATE TYPE "public"."ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "public"."ObservationChangeRequest" (
  "id" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "patch" JSONB NOT NULL,
  "comment" TEXT,
  "status" "public"."ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decisionComment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ObservationChangeRequest_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ObservationChangeRequest_observationId_status_idx"
  ON "public"."ObservationChangeRequest"("observationId", "status");

-- FKs
ALTER TABLE "public"."ObservationChangeRequest"
  ADD CONSTRAINT "ObservationChangeRequest_observationId_fkey"
  FOREIGN KEY ("observationId") REFERENCES "public"."Observation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ObservationChangeRequest"
  ADD CONSTRAINT "ObservationChangeRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."ObservationChangeRequest"
  ADD CONSTRAINT "ObservationChangeRequest_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "public"."User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Clean up: drop locked-fields trigger if it exists (we now enforce at app layer)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.triggers
             WHERE event_object_table = 'Observation'
               AND trigger_name = 'observation_prevent_locked_update') THEN
    EXECUTE 'DROP TRIGGER observation_prevent_locked_update ON "Observation"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'observation_prevent_locked_update') THEN
    EXECUTE 'DROP FUNCTION observation_prevent_locked_update()';
  END IF;
END $$;