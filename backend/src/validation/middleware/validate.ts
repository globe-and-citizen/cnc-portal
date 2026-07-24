import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { errorResponse } from '../../utils/utils';

/**
 * Validation middleware factory for request validation using Zod schemas
 * Updated for Zod v4 best practices
 */

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Format Zod error messages for better user experience
 * @param error - ZodError instance
 * @returns Formatted error message string
 */
const formatZodError = (error: ZodError): string => {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
};

/**
 * Creates a middleware function that validates request data using Zod schemas
 * @param schemas - Object containing schemas for body, query, and/or params
 * @returns Express middleware function
 */
export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body if schema provided
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          const errors = formatZodError(bodyResult.error);
          return errorResponse(400, `Invalid request body - ${errors}`, res);
        }
        req.body = bodyResult.data;
      }

      // Validate query if schema provided
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          const errors = formatZodError(queryResult.error);
          return errorResponse(400, `Invalid query parameters - ${errors}`, res);
        }
        req.query = queryResult.data as Request['query'];
      }

      // Validate params if schema provided
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          const errors = formatZodError(paramsResult.error);
          return errorResponse(400, `Invalid path parameters - ${errors}`, res);
        }
        req.params = paramsResult.data as Request['params'];
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return errorResponse(500, 'Validation middleware error', res);
    }
  };
};

/**
 * Validates params, query and body together against a single schema shaped
 * as `{ params, query, body }`, instead of three independent ones.
 *
 * Use this only when a field's requiredness depends on another part of the
 * request (e.g. a `query.action` value gating which `body` fields are
 * required) — `validate()`'s three independent `.safeParse()` calls can't
 * express that, since none of them sees the others' data. For anything that
 * doesn't need cross-field rules, prefer `validate()`.
 * @param schema - Zod schema for the combined `{ params, query, body }` shape
 * @returns Express middleware function
 */
export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({
        params: req.params,
        query: req.query,
        body: req.body,
      });
      if (!result.success) {
        const errors = formatZodError(result.error);
        return errorResponse(400, `Invalid request - ${errors}`, res);
      }

      const parsed = result.data as { params?: unknown; query?: unknown; body?: unknown };
      if (parsed.params !== undefined) req.params = parsed.params as Request['params'];
      if (parsed.query !== undefined) req.query = parsed.query as Request['query'];
      if (parsed.body !== undefined) req.body = parsed.body;

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return errorResponse(500, 'Validation middleware error', res);
    }
  };
};

/**
 * Helper functions for common validation patterns
 */

// Validate only request body
export const validateBody = (schema: ZodSchema) => validate({ body: schema });

// Validate only query parameters
export const validateQuery = (schema: ZodSchema) => validate({ query: schema });

// Validate only path parameters
export const validateParams = (schema: ZodSchema) => validate({ params: schema });

// Validate body and params
export const validateBodyAndParams = (bodySchema: ZodSchema, paramsSchema: ZodSchema) =>
  validate({ body: bodySchema, params: paramsSchema });

// Validate body and query
export const validateBodyAndQuery = (bodySchema: ZodSchema, querySchema: ZodSchema) =>
  validate({ body: bodySchema, query: querySchema });

// Validate params and query
export const validateParamsAndQuery = (paramsSchema: ZodSchema, querySchema: ZodSchema) =>
  validate({ params: paramsSchema, query: querySchema });

// Validate all three
export const validateAll = (
  bodySchema: ZodSchema,
  querySchema: ZodSchema,
  paramsSchema: ZodSchema
) => validate({ body: bodySchema, query: querySchema, params: paramsSchema });
