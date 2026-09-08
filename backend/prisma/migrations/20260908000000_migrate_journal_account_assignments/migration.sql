-- Preserve every original category decision as audit-only data. The application no
-- longer maps this table in Prisma or reads it at runtime.
ALTER TABLE "TransactionClassification" RENAME TO "LegacyTransactionClassificationAudit";

ALTER TABLE "LegacyTransactionClassificationAudit"
  ALTER COLUMN "category" TYPE TEXT
  USING ("category"::text);

DROP TYPE "TransactionClassificationCategory";

COMMENT ON TABLE "LegacyTransactionClassificationAudit" IS
  'Audit-only snapshot retained by the JournalAccountAssignment migration; not used at runtime.';

CREATE TABLE "JournalAccountAssignment" (
  "id" SERIAL NOT NULL,
  "teamId" INTEGER NOT NULL,
  "journalEntryId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "memo" TEXT,
  "assignedByAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JournalAccountAssignment_pkey" PRIMARY KEY ("id")
);

-- JournalEntry identity is the lowercase transaction hash, not an individual log.
-- If legacy rows somehow contain several decisions for the same transaction, the
-- latest decision becomes active and every original row remains in the audit table.
WITH ranked_legacy_decisions AS (
  SELECT
    "teamId",
    lower(split_part("txId", '-', 1)) AS "journalEntryId",
    CASE "category"
      WHEN 'REVENUE' THEN 'service-revenue'
      WHEN 'EXPENSE' THEN 'operating-expense'
      WHEN 'OWNER_CAPITAL' THEN 'owner-capital'
      WHEN 'PAYROLL_EXPENSE' THEN 'payroll-expense'
      WHEN 'INTEREST_EXPENSE' THEN 'interest-expense'
      WHEN 'DIVIDEND_EXPENSE' THEN 'dividend-expense'
    END AS "accountId",
    "memo",
    "classifiedByAddress" AS "assignedByAddress",
    "createdAt",
    "updatedAt",
    row_number() OVER (
      PARTITION BY "teamId", lower(split_part("txId", '-', 1))
      ORDER BY "updatedAt" DESC, "id" DESC
    ) AS decision_rank
  FROM "LegacyTransactionClassificationAudit"
  WHERE "category" <> 'INTERNAL_TRANSFER'
)
INSERT INTO "JournalAccountAssignment" (
  "teamId",
  "journalEntryId",
  "accountId",
  "memo",
  "assignedByAddress",
  "createdAt",
  "updatedAt"
)
SELECT
  "teamId",
  "journalEntryId",
  "accountId",
  "memo",
  "assignedByAddress",
  "createdAt",
  "updatedAt"
FROM ranked_legacy_decisions
WHERE decision_rank = 1 AND "accountId" IS NOT NULL;

CREATE UNIQUE INDEX "JournalAccountAssignment_teamId_journalEntryId_key"
  ON "JournalAccountAssignment"("teamId", "journalEntryId");

ALTER TABLE "JournalAccountAssignment"
  ADD CONSTRAINT "JournalAccountAssignment_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JournalAccountAssignment"
  ADD CONSTRAINT "JournalAccountAssignment_assignedByAddress_fkey"
  FOREIGN KEY ("assignedByAddress") REFERENCES "User"("address") ON DELETE SET NULL ON UPDATE CASCADE;
