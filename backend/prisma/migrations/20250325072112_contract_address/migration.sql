/*
  Warnings:

  - You are about to drop the column `bankAddress` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `boardOfDirectorsAddress` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `cashRemunerationEip712Address` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `expenseAccountAddress` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `expenseAccountEip712Address` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `investorsAddress` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `votingAddress` on the `Team` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[teamId,type]` on the table `TeamContract` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Team" DROP COLUMN "bankAddress",
DROP COLUMN "boardOfDirectorsAddress",
DROP COLUMN "cashRemunerationEip712Address",
DROP COLUMN "expenseAccountAddress",
DROP COLUMN "expenseAccountEip712Address",
DROP COLUMN "investorsAddress",
DROP COLUMN "votingAddress";

-- CreateIndex
CREATE UNIQUE INDEX "TeamContract_teamId_type_key" ON "TeamContract"("teamId", "type");
