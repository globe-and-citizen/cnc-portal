/*
  Warnings:

  - A unique constraint covering the columns `[generatedName]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "generatedName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_generatedName_key" ON "public"."User"("generatedName");
