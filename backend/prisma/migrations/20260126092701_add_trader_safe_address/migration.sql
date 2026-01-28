/*
  Warnings:

  - A unique constraint covering the columns `[traderSafeAddress]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "traderSafeAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_traderSafeAddress_key" ON "User"("traderSafeAddress");
