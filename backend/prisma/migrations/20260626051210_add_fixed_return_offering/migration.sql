-- CreateTable
CREATE TABLE "FixedReturnOffering" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "offerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedReturnOffering_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedReturnOffering_teamId_idx" ON "FixedReturnOffering"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedReturnOffering_teamId_offerId_key" ON "FixedReturnOffering"("teamId", "offerId");

-- AddForeignKey
ALTER TABLE "FixedReturnOffering" ADD CONSTRAINT "FixedReturnOffering_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
