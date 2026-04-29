-- Hotfix for environments that applied an earlier version of
-- 20260416120000_hours_to_minutes before the dual-column strategy was finalized.
--
-- Safe on fresh databases and on already-correct databases:
-- 1) keep legacy hoursWorked for backward compatibility,
-- 2) ensure new writes default hoursWorked to 0,
-- 3) ensure minutesWorked exists,
-- 4) backfill only missing minutesWorked values from legacy hoursWorked,
-- 5) enforce minutesWorked as required.

ALTER TABLE "Claim"
ALTER COLUMN "hoursWorked" SET DEFAULT 0;

ALTER TABLE "Claim"
ADD COLUMN IF NOT EXISTS "minutesWorked" INTEGER;

UPDATE "Claim"
SET "minutesWorked" = "hoursWorked" * 60
WHERE "minutesWorked" IS NULL;

ALTER TABLE "Claim"
ALTER COLUMN "minutesWorked" SET NOT NULL;