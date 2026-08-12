-- AlterTable: add effectiveFrom to Wage.
-- NULL means the wage is effective immediately (legacy and normal case).
-- A future timestamp means the wage is scheduled and the predecessor in the
-- chain remains operative until that date.
ALTER TABLE "Wage" ADD COLUMN "effectiveFrom" TIMESTAMP(3);
