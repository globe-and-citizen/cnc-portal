-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "weeklyClaimId" INTEGER;

-- CreateTable
CREATE TABLE "WeeklyClaim" (
    "id" SERIAL NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "memberAddress" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyClaim_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_weeklyClaimId_fkey" FOREIGN KEY ("weeklyClaimId") REFERENCES "WeeklyClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyClaim" ADD CONSTRAINT "WeeklyClaim_memberAddress_fkey" FOREIGN KEY ("memberAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyClaim" ADD CONSTRAINT "WeeklyClaim_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
