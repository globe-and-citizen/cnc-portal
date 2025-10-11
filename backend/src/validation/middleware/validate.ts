import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
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
        req.query = queryResult.data as any;
      }

      // Validate params if schema provided
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          const errors = formatZodError(paramsResult.error);
          return errorResponse(400, `Invalid path parameters - ${errors}`, res);
        }
        req.params = paramsResult.data as any;
      }

      next();
    } catch (error) {
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
