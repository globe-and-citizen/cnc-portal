import { z } from 'zod';
import { addressSchema, positiveIntegerSchema } from './common';

/**
 * Election route validation schemas
 */

export const addElectionNotificationsParamsSchema = z.object({
  teamId: positiveIntegerSchema,
});

export const addElectionNotificationsBodySchema = z
  .object({
    userIds: z.array(addressSchema).min(1).optional(),
    title: z.string().trim().min(1).max(255).optional(),
    message: z.string().trim().min(1).max(1000).optional(),
    type: z.enum(['info', 'warning', 'error', 'success']).optional(),
    electionId: positiveIntegerSchema.optional(),
    electionType: z.enum(['board_election', 'member_election', 'proposal_vote']).optional(),
  })
  .passthrough()
  .default({});
