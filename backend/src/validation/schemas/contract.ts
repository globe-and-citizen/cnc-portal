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
});

// Get contracts query parameters
export const getContractsQuerySchema = z.object({
  teamId: teamIdSchema,
});
