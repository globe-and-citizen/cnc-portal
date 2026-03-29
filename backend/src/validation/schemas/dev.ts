import { z } from 'zod';

/**
 * Dev controller validation schemas
 * These schemas are only used in development mode for testing purposes
 */

// SIWE message parameters schema
const siweMessageParamsSchema = z.object({
  nonce: z.string().min(1, 'Nonce cannot be empty'),
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format')
    .describe('Ethereum address (must match private key)'),
  domain: z.string().min(1, 'Domain cannot be empty'),
  chainId: z.number().int().positive('Chain ID must be a positive integer'),
  statement: z.string().optional(),
  uri: z.string().url('Invalid URI format').optional(),
});

// Generate SIWE signature request body
export const generateSiweSignatureBodySchema = z.object({
  messageParams: siweMessageParamsSchema,
  privateKey: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{64}$/,
      'Private key must be a hex string starting with 0x (66 chars total)'
    )
    .describe('Private key to sign with (for testing only!)'),
});

// Type exports for TypeScript
export type SiweMessageParams = z.infer<typeof siweMessageParamsSchema>;
export type GenerateSiweSignatureBody = z.infer<typeof generateSiweSignatureBodySchema>;
