import { z } from "zod";
import { isAddress } from "viem";

/**
 * Common validation schemas used across the application
 * Updated for Zod v4 best practices with improved performance and error handling
 */

// Enhanced address validation with custom error messages
export const addressSchema = z
  .string({ message: "Address is required" })
  .min(1, "Address is required")
  .refine(
    (value) => isAddress(value),
    {
      message: "Invalid Ethereum address format. Expected format: 0x followed by 40 hexadecimal characters",
    }
  );

// Enhanced positive integer schema with better error messages
export const positiveIntegerSchema = z
  .coerce
  .number({ message: "Must be a number" })
  .int("Must be an integer")
  .positive("Must be a positive integer");

// Enhanced positive number schema
export const positiveNumberSchema = z
  .coerce
  .number({ message: "Must be a number" })
  .positive("Must be a positive number");

// Enhanced non-empty string schema with trimming and better validation
export const nonEmptyStringSchema = z
  .string({ message: "Must be a string" })
  .trim()
  .min(1, "Cannot be empty or whitespace only");

// Common ID schemas
export const teamIdSchema = positiveIntegerSchema;
export const userIdSchema = positiveIntegerSchema;
export const claimIdSchema = positiveIntegerSchema;

// Enhanced pagination schema with proper defaults and limits
export const paginationSchema = z.object({
  page: z
    .coerce
    .number({ message: "Page must be a number" })
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),
  limit: z
    .coerce
    .number({ message: "Limit must be a number" })
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});

// Common query parameters with enhanced validation
export const teamIdQuerySchema = z.object({
  teamId: teamIdSchema,
});

// Common path parameters with enhanced validation
export const teamIdParamsSchema = z.object({
  id: teamIdSchema,
});

export const addressParamsSchema = z.object({
  address: addressSchema,
});

export const claimIdParamsSchema = z.object({
  claimId: claimIdSchema,
});

// URL validation schema for better error messages
export const urlSchema = z
  .url("Must be a valid URL").refine(
    (val) => val.startsWith("http://") || val.startsWith("https://"),
    {
      message: "URL must start with http:// or https://",
    }
  );