-- CreateTable
CREATE TABLE "public"."GlobalSetting" (
    "id" SERIAL NOT NULL,
    "fonctionName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isGloballyRestricted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamFunctionOverride" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "functionName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFunctionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSetting_fonctionName_key" ON "public"."GlobalSetting"("fonctionName");

-- CreateIndex
CREATE INDEX "TeamFunctionOverride_teamId_idx" ON "public"."TeamFunctionOverride"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamFunctionOverride_teamId_functionName_key" ON "public"."TeamFunctionOverride"("teamId", "functionName");

-- AddForeignKey
ALTER TABLE "public"."TeamFunctionOverride" ADD CONSTRAINT "TeamFunctionOverride_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamFunctionOverride" ADD CONSTRAINT "TeamFunctionOverride_functionName_fkey" FOREIGN KEY ("functionName") REFERENCES "public"."GlobalSetting"("fonctionName") ON DELETE RESTRICT ON UPDATE CASCADE;
