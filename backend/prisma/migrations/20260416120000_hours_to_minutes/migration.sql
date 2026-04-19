-- Safe, idempotent unit migration strategy:
-- 1) Keep legacy "hoursWorked" untouched.
-- 2) Add a dedicated "minutesWorked" column.
-- 3) Backfill only rows where "minutesWorked" is still NULL.
--
-- This avoids value-based heuristics and guarantees existing minute values
-- are never reprocessed on migration replay.

ALTER TABLE "Claim"
ADD COLUMN IF NOT EXISTS "minutesWorked" INTEGER;

UPDATE "Claim"
SET "minutesWorked" = "hoursWorked" * 60
WHERE "minutesWorked" IS NULL;
