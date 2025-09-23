import { z } from "zod";
import { addressSchema, positiveIntegerSchema, nonEmptyStringSchema } from "./common";

/**
 * User-related validation schemas
 */

// User search query parameters
export const userSearchQuerySchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
}).refine(
  (data) => data.name || data.address,
  {
    message: "Either name or address must be provided",
    path: ["name"], // This will show the error on the name field
  }
);

// User update request body
export const updateUserBodySchema = z.object({
  name: nonEmptyStringSchema.optional(),
  imageUrl: z.string().url().optional(),
}).refine(
  (data) => data.name !== undefined || data.imageUrl !== undefined,
  {
    message: "At least one field (name or imageUrl) must be provided",
  }
);

// Pagination query for users
export const userPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});