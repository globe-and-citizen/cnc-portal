import { z } from "zod";
import { isAddress } from "viem";

/**
 * Common validation schemas used across the application
 */

// Base schemas for common types
export const addressSchema = z.string().refine(
  (value) => isAddress(value),
  {
    message: "Invalid Ethereum address format",
  }
);

export const positiveIntegerSchema = z.coerce.number().int().positive({
  message: "Must be a positive integer",
});

export const positiveNumberSchema = z.coerce.number().positive({
  message: "Must be a positive number",
});

export const nonEmptyStringSchema = z.string().trim().min(1, {
  message: "Cannot be empty",
});

export const teamIdSchema = positiveIntegerSchema;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Common query parameters
export const teamIdQuerySchema = z.object({
  teamId: teamIdSchema,
});

// Common path parameters
export const teamIdParamsSchema = z.object({
  id: teamIdSchema,
});

export const addressParamsSchema = z.object({
  address: addressSchema,
});

export const claimIdParamsSchema = z.object({
  claimId: positiveIntegerSchema,
});