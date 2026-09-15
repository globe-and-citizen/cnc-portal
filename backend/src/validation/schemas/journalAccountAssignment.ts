import { z } from 'zod';
import { teamIdSchema } from './common';

/** Counter-accounts owners may assign to an eligible external treasury outflow. */
export const JOURNAL_ASSIGNMENT_ACCOUNT_IDS = [
  'operating-expense',
  'owner-capital',
  'payroll-expense',
  'interest-expense',
  'dividend-expense',
] as const;

export const journalAssignmentAccountIdSchema = z.enum(JOURNAL_ASSIGNMENT_ACCOUNT_IDS);

/** Canonical JournalEntry identity: the lowercase transaction hash. */
export const journalEntryIdSchema = z
  .string({ message: 'journalEntryId is required' })
  .trim()
  .regex(/^0x[0-9a-fA-F]{64}$/, 'journalEntryId must be a transaction hash')
  .transform((value) => value.toLowerCase());

export const journalAssignmentMemoSchema = z
  .string()
  .trim()
  .max(500, 'Memo cannot exceed 500 characters');

export const upsertJournalAccountAssignmentBodySchema = z.object({
  teamId: teamIdSchema,
  journalEntryId: journalEntryIdSchema,
  accountId: journalAssignmentAccountIdSchema,
  memo: journalAssignmentMemoSchema.optional(),
});

export const getJournalAccountAssignmentsQuerySchema = z.object({
  teamId: teamIdSchema,
});

export const deleteJournalAccountAssignmentQuerySchema = z.object({
  teamId: teamIdSchema,
  journalEntryId: journalEntryIdSchema,
});
