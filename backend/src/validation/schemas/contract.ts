import { z } from 'zod';
import { addressSchema, teamIdSchema } from './common';

/**
 * Contract-related validation schemas
 */

// Valid contract types enum
const contractTypes = [
  'Bank',
  'InvestorV1',
  'Voting',
  'BoardOfDirectors',
  'ExpenseAccount',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'Campaign',
  'SafeDepositRouter',
  'Safe',
] as const;

// Add contract request body
export const addContractBodySchema = z.object({
  teamId: teamIdSchema,
  contractAddress: addressSchema,
  contractType: z.enum(contractTypes, {
    message: 'Invalid contract type',
  }),
});

// Sync contracts request body
export const syncContractsBodySchema = z.object({
  teamId: teamIdSchema,
  deployBlockNumber: z.coerce.number().int().nonnegative().optional(),
  deployedAt: z.coerce.date().optional(),
});

// Create officer contract request body — registers a freshly deployed Officer
// on a team. Inserts a TeamOfficer row as the new head of the linked list and
// syncs the contracts it governs in a single call.
export const createOfficerBodySchema = z.object({
  teamId: teamIdSchema,
  address: addressSchema,
  deployBlockNumber: z.coerce.number().int().nonnegative().optional(),
  deployedAt: z.coerce.date().optional(),
});

// Get contracts query parameters
export const getContractsQuerySchema = z.object({
  teamId: teamIdSchema,
});
