-- CreateEnum
CREATE TYPE "GlobalSettingStatus" AS ENUM ('enabled', 'disabled', 'beta');

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "id" SERIAL NOT NULL,
    "functionName" TEXT NOT NULL,
    "status" "GlobalSettingStatus" NOT NULL DEFAULT 'disabled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamFunctionOverride" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "functionName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFunctionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSetting_functionName_key" ON "GlobalSetting"("functionName");

-- CreateIndex
CREATE INDEX "TeamFunctionOverride_teamId_idx" ON "TeamFunctionOverride"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamFunctionOverride_teamId_functionName_key" ON "TeamFunctionOverride"("teamId", "functionName");

-- AddForeignKey
ALTER TABLE "TeamFunctionOverride" ADD CONSTRAINT "TeamFunctionOverride_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFunctionOverride" ADD CONSTRAINT "TeamFunctionOverride_functionName_fkey" FOREIGN KEY ("functionName") REFERENCES "GlobalSetting"("functionName") ON DELETE RESTRICT ON UPDATE CASCADE;
