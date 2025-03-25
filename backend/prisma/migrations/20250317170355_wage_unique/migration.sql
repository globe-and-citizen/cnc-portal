/*
  Warnings:

  - A unique constraint covering the columns `[teamId,userAddress,nextWageId]` on the table `Wage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Wage_teamId_userAddress_nextWageId_key" ON "Wage"("teamId", "userAddress", "nextWageId");
