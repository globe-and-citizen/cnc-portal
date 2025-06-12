/*
  Warnings:

  - Made the column `hoursWorked` on table `Claim` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Claim" ALTER COLUMN "hoursWorked" SET NOT NULL;

-- AlterTable
ALTER TABLE "Wage" ADD COLUMN     "cashRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "tokenRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "usdcRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
