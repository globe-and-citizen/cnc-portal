/*
  Warnings:

  - Made the column `weeklyClaimId` on table `Claim` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Claim" DROP CONSTRAINT "Claim_wageId_fkey";

-- DropForeignKey
ALTER TABLE "Claim" DROP CONSTRAINT "Claim_weeklyClaimId_fkey";

-- AlterTable
ALTER TABLE "Claim" ALTER COLUMN "weeklyClaimId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_wageId_fkey" FOREIGN KEY ("wageId") REFERENCES "Wage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_weeklyClaimId_fkey" FOREIGN KEY ("weeklyClaimId") REFERENCES "WeeklyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
