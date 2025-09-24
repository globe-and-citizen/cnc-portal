import { z } from "zod";
import { teamIdSchema, positiveIntegerSchema } from "./common";

/**
 * Expense-related validation schemas
 */

// Budget limit data structure
const budgetLimitSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().optional(),
  // Add other properties as needed based on the BudgetLimit type
}).passthrough(); // Allow additional properties

// Expense creation request body
export const addExpenseBodySchema = z.object({
  teamId: teamIdSchema,
  signature: z.string().min(1, "Signature cannot be empty"),
  data: z.union([
    z.string().transform((str) => {
      try {
        return JSON.parse(str);
      } catch {
        throw new Error("Invalid JSON in data field");
      }
    }),
    budgetLimitSchema,
  ]),
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