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
ALTER TABLE "Wage" DROP CONSTRAINT "Wage_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Wage" DROP CONSTRAINT "Wage_userAddress_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyClaim" DROP CONSTRAINT "WeeklyClaim_memberAddress_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyClaim" DROP CONSTRAINT "WeeklyClaim_teamId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyClaim" DROP CONSTRAINT "WeeklyClaim_wageId_fkey";

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "BoardOfDirectorActions" ADD CONSTRAINT "BoardOfDirectorActions_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardOfDirectorActions" ADD CONSTRAINT "BoardOfDirectorActions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
