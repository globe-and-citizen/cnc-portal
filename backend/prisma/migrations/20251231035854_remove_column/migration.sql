/*
  Warnings:

  - You are about to drop the column `userAddress` on the `MemberTeamsData` table. All the data in the column will be lost.
  - You are about to drop the column `cashRatePerHour` on the `Wage` table. All the data in the column will be lost.
  - You are about to drop the column `tokenRatePerHour` on the `Wage` table. All the data in the column will be lost.
  - You are about to drop the column `usdcRatePerHour` on the `Wage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[memberAddress,teamId]` on the table `MemberTeamsData` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[wageId,weekStart]` on the table `WeeklyClaim` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `memberAddress` to the `MemberTeamsData` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BoardOfDirectorActions" DROP CONSTRAINT "BoardOfDirectorActions_teamId_fkey";

-- DropForeignKey
ALTER TABLE "BoardOfDirectorActions" DROP CONSTRAINT "BoardOfDirectorActions_userAddress_fkey";

-- DropForeignKey
ALTER TABLE "Claim" DROP CONSTRAINT "Claim_wageId_fkey";

-- DropForeignKey
ALTER TABLE "Claim" DROP CONSTRAINT "Claim_weeklyClaimId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_userAddress_fkey";

-- DropForeignKey
ALTER TABLE "MemberTeamsData" DROP CONSTRAINT "MemberTeamsData_teamId_fkey";

-- DropForeignKey
ALTER TABLE "MemberTeamsData" DROP CONSTRAINT "MemberTeamsData_userAddress_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userAddress_fkey";

-- DropForeignKey
ALTER TABLE "TeamContract" DROP CONSTRAINT "TeamContract_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamFunctionOverride" DROP CONSTRAINT "TeamFunctionOverride_functionName_fkey";

-- DropForeignKey
ALTER TABLE "TeamFunctionOverride" DROP CONSTRAINT "TeamFunctionOverride_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Wage" DROP CONSTRAINT "Wage_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Wage" DROP CONSTRAINT "Wage_userAddress_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyClaim" DROP CONSTRAINT "WeeklyClaim_memberAddress_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyClaim" DROP CONSTRAINT "WeeklyClaim_teamId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyClaim" DROP CONSTRAINT "WeeklyClaim_wageId_fkey";

-- DropIndex
DROP INDEX "MemberTeamsData_userAddress_teamId_key";

-- AlterTable
ALTER TABLE "MemberTeamsData" DROP COLUMN "userAddress",
ADD COLUMN     "memberAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Wage" DROP COLUMN "cashRatePerHour",
DROP COLUMN "tokenRatePerHour",
DROP COLUMN "usdcRatePerHour";

-- CreateIndex
CREATE UNIQUE INDEX "MemberTeamsData_memberAddress_teamId_key" ON "MemberTeamsData"("memberAddress", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyClaim_wageId_weekStart_key" ON "WeeklyClaim"("wageId", "weekStart");

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_memberAddress_fkey" FOREIGN KEY ("memberAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wage" ADD CONSTRAINT "Wage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wage" ADD CONSTRAINT "Wage_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_wageId_fkey" FOREIGN KEY ("wageId") REFERENCES "Wage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_weeklyClaimId_fkey" FOREIGN KEY ("weeklyClaimId") REFERENCES "WeeklyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyClaim" ADD CONSTRAINT "WeeklyClaim_memberAddress_fkey" FOREIGN KEY ("memberAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyClaim" ADD CONSTRAINT "WeeklyClaim_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyClaim" ADD CONSTRAINT "WeeklyClaim_wageId_fkey" FOREIGN KEY ("wageId") REFERENCES "Wage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamContract" ADD CONSTRAINT "TeamContract_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardOfDirectorActions" ADD CONSTRAINT "BoardOfDirectorActions_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardOfDirectorActions" ADD CONSTRAINT "BoardOfDirectorActions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFunctionOverride" ADD CONSTRAINT "TeamFunctionOverride_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFunctionOverride" ADD CONSTRAINT "TeamFunctionOverride_functionName_fkey" FOREIGN KEY ("functionName") REFERENCES "GlobalSetting"("functionName") ON DELETE CASCADE ON UPDATE CASCADE;
