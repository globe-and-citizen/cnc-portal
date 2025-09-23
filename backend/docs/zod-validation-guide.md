# Zod Validation Guide

This document provides guidelines on how to use Zod validation schemas in the CNC Portal backend.

## Overview

We've replaced manual validation with Zod schemas for better type safety, consistency, and maintainability. All request validation is now handled through reusable schemas and middleware.

## Key Components

### 1. Validation Schemas (`src/validation/schemas/`)

All validation schemas are organized by feature:

- `common.ts` - Base schemas used across the application
- `user.ts` - User-related validation
- `claim.ts` - Claim validation with complex business rules
- `contract.ts` - Contract validation with enum types
- `expense.ts` - Expense validation with union types
- `wage.ts` - Wage validation with array types

### 2. Validation Middleware (`src/validation/middleware/validate.ts`)

Provides flexible validation functions:

- `validate({ body, query, params })` - Main validation function
- `validateBody(schema)` - Validates request body only
- `validateQuery(schema)` - Validates query parameters only
- `validateParams(schema)` - Validates path parameters only
- Helper functions for combinations

## Usage Examples

### Basic Schema Definition

```typescript
// In validation/schemas/example.ts
import { z } from "zod";
import { addressSchema, teamIdSchema } from "./common";

export const createUserBodySchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  email: z.string().email("Invalid email format"),
  address: addressSchema, // Reuse common schemas
});

export const getUserParamsSchema = z.object({
  userId: z.coerce.number().positive("User ID must be positive"),
});
```

### Route Validation

```typescript
// In routes/exampleRoute.ts
import { validateBody, validateParams, createUserBodySchema, getUserParamsSchema } from "../validation";

// Single validation
router.post("/users", validateBody(createUserBodySchema), createUser);
router.get("/users/:userId", validateParams(getUserParamsSchema), getUser);

// Multiple validations
router.put("/users/:userId", 
  validateParams(getUserParamsSchema),
  validateBody(createUserBodySchema),
  updateUser
);
```

### Controller Implementation

```typescript
// In controllers/exampleController.ts
export const createUser = async (req: Request, res: Response) => {
  // No manual validation needed - Zod middleware handles it
  const { name, email, address } = req.body; // Types are inferred from schema
  
  try {
    const user = await prisma.user.create({
      data: { name, email, address }
    });
    return res.status(201).json(user);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
```

## Schema Patterns

### Address Validation
```typescript
import { addressSchema } from "./common";
// Validates Ethereum addresses using viem's isAddress()
```

### Enum Validation
```typescript
const statusSchema = z.enum(["pending", "approved", "rejected"], {
  errorMap: () => ({ message: "Invalid status. Allowed: pending, approved, rejected" })
});
```

### Array Validation
```typescript
const rateSchema = z.array(z.object({
  type: z.string().min(1),
  amount: z.coerce.number().positive()
})).min(1, "At least one rate required");
```

### Union Types
```typescript
const dataSchema = z.union([
  z.string().transform(str => JSON.parse(str)), // Parse JSON string
  z.object({ /* predefined object */ })         // Or accept object directly
]);
```

### Number Coercion
```typescript
const teamIdSchema = z.coerce.number().int().positive(); // Converts string to number
```

## Error Handling

Zod validation provides detailed error messages:

```json
{
  "message": "Invalid request body - name: String must contain at least 1 character(s), email: Invalid email"
}
```

## Best Practices

1. **Reuse Common Schemas**: Use `addressSchema`, `teamIdSchema`, etc. from `common.ts`

2. **Descriptive Error Messages**: Provide clear error messages for better API usability

3. **Type Coercion**: Use `z.coerce.number()` for converting strings to numbers

4. **Schema Composition**: Build complex schemas from simpler ones

5. **Business Logic Separation**: Keep business validation in controllers, input validation in schemas

## Migration Examples

### Before (Manual Validation)
```typescript
export const createUser = async (req: Request, res: Response) => {
  const { name, email } = req.body;
  
  if (!name || name.trim() === "") {
    return errorResponse(400, "Name is required", res);
  }
  
  if (!email || !email.includes("@")) {
    return errorResponse(400, "Valid email is required", res);
  }
  
  // ... rest of function
};
```

### After (Zod Validation)
```typescript
// Schema definition
export const createUserBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
});

// Route
router.post("/users", validateBody(createUserBodySchema), createUser);

// Controller
export const createUser = async (req: Request, res: Response) => {
  const { name, email } = req.body; // Already validated and typed
  // ... rest of function
};
```

## Benefits Achieved

- **150+ lines of manual validation removed**
- **Consistent error message format**
- **Better TypeScript integration**
- **Reusable validation logic**
- **Improved developer experience**
- **Centralized validation rules**