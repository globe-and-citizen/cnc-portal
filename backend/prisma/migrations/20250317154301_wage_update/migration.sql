/*
  Warnings:

  - You are about to drop the `wageRelated` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[nextWageId]` on the table `Wage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "wageRelated" DROP CONSTRAINT "wageRelated_nextWageId_fkey";

-- DropForeignKey
ALTER TABLE "wageRelated" DROP CONSTRAINT "wageRelated_previousWageId_fkey";

-- AlterTable
ALTER TABLE "Wage" ADD COLUMN     "nextWageId" INTEGER;

-- DropTable
DROP TABLE "wageRelated";

-- CreateIndex
CREATE UNIQUE INDEX "Wage_nextWageId_key" ON "Wage"("nextWageId");

-- AddForeignKey
ALTER TABLE "Wage" ADD CONSTRAINT "Wage_nextWageId_fkey" FOREIGN KEY ("nextWageId") REFERENCES "Wage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
