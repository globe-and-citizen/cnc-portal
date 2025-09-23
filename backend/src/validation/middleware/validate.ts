import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";
import { errorResponse } from "../../utils/utils";

/**
 * Validation middleware factory for request validation using Zod schemas
 */

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

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
          const errors = bodyResult.error.errors.map(
            (err) => `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          return errorResponse(400, `Invalid request body - ${errors}`, res);
        }
        req.body = bodyResult.data;
      }

      // Validate query if schema provided
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          const errors = queryResult.error.errors.map(
            (err) => `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          return errorResponse(400, `Invalid query parameters - ${errors}`, res);
        }
        req.query = queryResult.data;
      }

      // Validate params if schema provided
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          const errors = paramsResult.error.errors.map(
            (err) => `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          return errorResponse(400, `Invalid path parameters - ${errors}`, res);
        }
        req.params = paramsResult.data;
      }

      next();
    } catch (error) {
      return errorResponse(500, error, res);
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
export const validateAll = (bodySchema: ZodSchema, querySchema: ZodSchema, paramsSchema: ZodSchema) =>
  validate({ body: bodySchema, query: querySchema, params: paramsSchema });