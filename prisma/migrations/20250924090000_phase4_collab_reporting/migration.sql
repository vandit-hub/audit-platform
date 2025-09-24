-- CreateEnum
CREATE TYPE "public"."NoteVisibility" AS ENUM ('INTERNAL', 'ALL');

-- AlterTable: add visibility column to RunningNote
ALTER TABLE "public"."RunningNote"
  ADD COLUMN "visibility" "public"."NoteVisibility" NOT NULL DEFAULT 'INTERNAL';

-- Index to help filtering by visibility
CREATE INDEX "RunningNote_observationId_visibility_idx"
  ON "public"."RunningNote"("observationId", "visibility");