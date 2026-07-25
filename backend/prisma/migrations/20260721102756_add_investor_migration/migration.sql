-- CreateTable
CREATE TABLE "InvestorMigration" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "previousInvestorAddress" TEXT NOT NULL,
    "newInvestorAddress" TEXT NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "shareholders" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorMigration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestorMigration_newInvestorAddress_key" ON "InvestorMigration"("newInvestorAddress");

-- CreateIndex
CREATE INDEX "InvestorMigration_teamId_idx" ON "InvestorMigration"("teamId");

-- AddForeignKey
ALTER TABLE "InvestorMigration" ADD CONSTRAINT "InvestorMigration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
