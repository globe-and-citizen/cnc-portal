/*
  Warnings:

  - You are about to drop the column `imageScreens` on the `Claim` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Claim" DROP CONSTRAINT "Claim_wageId_fkey";

-- DropForeignKey
ALTER TABLE "Claim" DROP CONSTRAINT "Claim_weeklyClaimId_fkey";

-- AlterTable
ALTER TABLE "Claim" DROP COLUMN "imageScreens",
ADD COLUMN     "fileAttachments" JSONB;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_wageId_fkey" FOREIGN KEY ("wageId") REFERENCES "Wage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_weeklyClaimId_fkey" FOREIGN KEY ("weeklyClaimId") REFERENCES "WeeklyClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
