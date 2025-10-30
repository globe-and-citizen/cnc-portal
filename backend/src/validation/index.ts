/**
 * Validation exports - central place to import validation schemas and middleware
 * Updated for Zod v4 with best practices and advanced utilities
 */

// Middleware exports
export * from "./middleware/validate";

// Schema exports
export * from "./schemas/common";
export * from "./schemas/user";
export * from "./schemas/claim";
export * from "./schemas/contract";
export * from "./schemas/expense";
export * from "./schemas/wage";
export * from "./schemas/auth";

// Advanced validation utilities (Zod v4 best practices)
export * from "./utils";

// Type inference helpers and core Zod exports
export { z } from "zod";
export type { 
  ZodError, 
  ZodSchema, 
  ZodIssue,
  ZodErrorMap,
} from "zod";