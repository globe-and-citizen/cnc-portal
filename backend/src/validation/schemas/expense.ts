import { z } from "zod";
import { teamIdSchema } from "./common";

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
  status: z.enum(["all", "pending", "approved", "rejected"]).default("all"),
});