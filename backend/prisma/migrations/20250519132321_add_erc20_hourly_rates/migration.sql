/*
  Warnings:

  - Added the required column `sherRatePerHour` to the `Wage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usdcRatePerHour` to the `Wage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Wage" ADD COLUMN     "sherRatePerHour" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "usdcRatePerHour" DOUBLE PRECISION NOT NULL;
