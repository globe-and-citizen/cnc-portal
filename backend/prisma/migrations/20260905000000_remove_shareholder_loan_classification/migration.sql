-- Drop the shareholder-loan classification category. Any transaction already booked
-- under it loses its override and falls back to the address inference, so the rows are
-- deleted rather than remapped onto a category the owner never chose.
DELETE FROM "TransactionClassification" WHERE "category" = 'SHAREHOLDER_LOAN';

-- Postgres has no `ALTER TYPE ... DROP VALUE`, so the enum is recreated without it and
-- the column is re-pointed at the new type through its text representation.
ALTER TYPE "TransactionClassificationCategory" RENAME TO "TransactionClassificationCategory_old";

CREATE TYPE "TransactionClassificationCategory" AS ENUM ('REVENUE', 'EXPENSE', 'OWNER_CAPITAL', 'INTERNAL_TRANSFER', 'PAYROLL_EXPENSE', 'INTEREST_EXPENSE', 'DIVIDEND_EXPENSE');

ALTER TABLE "TransactionClassification"
  ALTER COLUMN "category" TYPE "TransactionClassificationCategory"
  USING ("category"::text::"TransactionClassificationCategory");

DROP TYPE "TransactionClassificationCategory_old";
