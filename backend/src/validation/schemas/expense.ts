import { z } from "zod";
import { teamIdSchema, positiveIntegerSchema } from "./common";

/**
 * Expense-related validation schemas
 */


// Expense creation request body
export const addExpenseBodySchema = z.object({
  teamId: teamIdSchema,
  signature: z.string().min(1, "Signature cannot be empty"),
  data: z.json(),
});

// Get expenses query parameters
export const getExpensesQuerySchema = z.object({
  teamId: teamIdSchema,
  status: z.enum(["all", "pending", "approved", "rejected", "disabled", "enabled", "signed"], {
    message: "Invalid status parameter"
  }).default("all"),
});

// Update expense request body
export const updateExpenseBodySchema = z.object({
  status: z.enum(["disable", "expired", "limitReached"], {
    message: "Invalid status. Allowed values: disable, expired, limitReached"
  }),
});

// Update expense path parameters
export const updateExpenseParamsSchema = z.object({
  id: positiveIntegerSchema,
});