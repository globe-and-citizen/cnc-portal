import { z } from 'zod';
import { addressSchema, teamIdSchema, nonEmptyStringSchema } from './common';

/**
 * Team-related validation schemas
 */

// Member object schema used in team creation
const memberSchema = z.object({
  address: addressSchema,
  name: z.string().optional(),
});

// Add team request body
export const addTeamBodySchema = z.object({
  name: nonEmptyStringSchema,
  description: z.string().optional(),
  members: z.array(memberSchema).default([]),
});

// Update team request body
export const updateTeamBodySchema = z.object({
  name: nonEmptyStringSchema.optional(),
  description: z.string().optional(),
});

// Get all teams query parameters
export const getAllTeamsQuerySchema = z.object({
  userAddress: addressSchema.optional(),
});

// Add members request body
export const addMembersBodySchema = z
  .array(
    z.object({
      address: addressSchema,
    })
  )
  .min(1, 'At least one member is required');

// Delete member path parameters
export const deleteMemberParamsSchema = z.object({
  id: teamIdSchema,
  memberAddress: addressSchema,
});
