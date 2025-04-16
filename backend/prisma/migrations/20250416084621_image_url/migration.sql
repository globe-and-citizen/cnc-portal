/*
  Warnings:

  - You are about to drop the column `expenseAccountData` on the `MemberTeamsData` table. All the data in the column will be lost.
  - You are about to drop the column `expenseAccountSignature` on the `MemberTeamsData` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MemberTeamsData" DROP COLUMN "expenseAccountData",
DROP COLUMN "expenseAccountSignature";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "imageUrl" TEXT;
