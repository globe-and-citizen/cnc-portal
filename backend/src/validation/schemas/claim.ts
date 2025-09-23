import { z } from "zod";
import { addressSchema, positiveIntegerSchema, teamIdSchema } from "./common";

/**
 * Claim-related validation schemas
 */

// Rate per hour validation
export const ratePerHourSchema = z.object({
  type: z.string().min(1, "Rate type cannot be empty"),
  amount: z.coerce.number().positive("Rate amount must be positive"),
});

// Claim creation request body
export const addClaimBodySchema = z.object({
  teamId: teamIdSchema,
  hoursWorked: z.coerce.number().positive("Hours worked must be positive"),
  memo: z.string().trim().min(1, "Memo cannot be empty").refine(
    (memo) => memo.split(/\s+/).length <= 200,
    {
      message: "Memo is too long, maximum 200 words allowed",
    }
  ),
  dayWorked: z.string().datetime().optional(),
});

// Claim update request body (for signature)
export const updateClaimBodySchema = z.object({
  signature: z.string().min(1, "Signature cannot be empty").optional(),
});

// Claim update query parameters
export const updateClaimQuerySchema = z.object({
  action: z.enum(["sign", "withdraw", "disable", "enable", "reject"], {
    errorMap: () => ({ message: "Invalid action. Allowed actions are: sign, withdraw, disable, enable, reject" })
  }),
});

// Get claims query parameters
export const getClaimsQuerySchema = z.object({
  teamId: teamIdSchema,
  status: z.string().optional(),
  memberAddress: addressSchema.optional(),
});