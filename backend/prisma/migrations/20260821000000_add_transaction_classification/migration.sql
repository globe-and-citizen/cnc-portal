-- CreateEnum
CREATE TYPE "TransactionClassificationCategory" AS ENUM ('REVENUE', 'EXPENSE', 'SHAREHOLDER_LOAN', 'OWNER_CAPITAL', 'INTERNAL_TRANSFER');

-- CreateTable
CREATE TABLE "TransactionClassification" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "txId" TEXT NOT NULL,
    "category" "TransactionClassificationCategory" NOT NULL,
    "memo" TEXT,
    "classifiedByAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Composite unique doubles as the only read index: `?teamId=` scans it by the
-- teamId prefix, upsert/delete hit it as a point lookup. No separate teamId index.
CREATE UNIQUE INDEX "TransactionClassification_teamId_txId_key" ON "TransactionClassification"("teamId", "txId");

-- AddForeignKey
ALTER TABLE "TransactionClassification" ADD CONSTRAINT "TransactionClassification_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionClassification" ADD CONSTRAINT "TransactionClassification_classifiedByAddress_fkey" FOREIGN KEY ("classifiedByAddress") REFERENCES "User"("address") ON DELETE SET NULL ON UPDATE CASCADE;
