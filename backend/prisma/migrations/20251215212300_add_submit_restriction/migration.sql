-- CreateTable
CREATE TABLE "public"."GlobalRestrictionSetting" (
    "id" SERIAL NOT NULL,
    "isGloballyRestricted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalRestrictionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamRestrictionOverride" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "isSubmitRestricted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamRestrictionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamRestrictionOverride_teamId_key" ON "public"."TeamRestrictionOverride"("teamId");

-- CreateIndex
CREATE INDEX "TeamRestrictionOverride_teamId_idx" ON "public"."TeamRestrictionOverride"("teamId");
