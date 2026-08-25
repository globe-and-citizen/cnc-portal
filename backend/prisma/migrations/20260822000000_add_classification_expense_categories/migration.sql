-- Add the outflow expense categories a Bank/Safe withdrawal can be classified into
-- (issue #2457): paying wages, loan interest, or a dividend directly from a pocket.
-- Postgres 12+ permits ALTER TYPE ... ADD VALUE inside a transaction as long as the
-- new value is not used in the same transaction — which it is not here.
ALTER TYPE "TransactionClassificationCategory" ADD VALUE 'PAYROLL_EXPENSE';
ALTER TYPE "TransactionClassificationCategory" ADD VALUE 'INTEREST_EXPENSE';
ALTER TYPE "TransactionClassificationCategory" ADD VALUE 'DIVIDEND_EXPENSE';
