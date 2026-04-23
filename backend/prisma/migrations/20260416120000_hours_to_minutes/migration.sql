-- Safe, idempotent unit migration strategy:
-- 1) Keep legacy "hoursWorked" for backward compatibility.
-- 2) Add a dedicated "minutesWorked" column.
-- 3) Backfill only rows where "minutesWorked" is still NULL.
-- 4) Default future "hoursWorked" writes to 0; new canonical value is "minutesWorked".
--
-- This avoids value-based heuristics and guarantees existing minute values
-- are never reprocessed on migration replay.

ALTER TABLE "Claim"
ALTER COLUMN "hoursWorked" SET DEFAULT 0;

ALTER TABLE "Claim"
ADD COLUMN IF NOT EXISTS "minutesWorked" INTEGER;

UPDATE "Claim"
SET "minutesWorked" = "hoursWorked" * 60
WHERE "minutesWorked" IS NULL;

ALTER TABLE "Claim"
ALTER COLUMN "minutesWorked" SET NOT NULL;
