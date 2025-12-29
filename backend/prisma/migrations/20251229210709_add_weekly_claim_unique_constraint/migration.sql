/*
  Warnings:

  - You are about to drop the column `cashRatePerHour` on the `Wage` table. All the data in the column will be lost.
  - You are about to drop the column `tokenRatePerHour` on the `Wage` table. All the data in the column will be lost.
  - You are about to drop the column `usdcRatePerHour` on the `Wage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[wageId,weekStart]` on the table `WeeklyClaim` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Wage" DROP COLUMN "cashRatePerHour",
DROP COLUMN "tokenRatePerHour",
DROP COLUMN "usdcRatePerHour";

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyClaim_wageId_weekStart_key" ON "WeeklyClaim"("wageId", "weekStart");
