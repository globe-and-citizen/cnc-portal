-- AlterTable
ALTER TABLE "Wage" ADD COLUMN     "maximumOvertimeHoursPerWeek" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeRatePerHour" JSONB;
