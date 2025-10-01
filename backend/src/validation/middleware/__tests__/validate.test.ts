import { describe, expect, it, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { z } from "zod";
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateBodyAndParams,
  validateBodyAndQuery,
  validateParamsAndQuery,
  validateAll,
} from "../validate";

// Mock errorResponse
vi.mock("../../../utils/utils", () => ({
  errorResponse: vi.fn((status: number, message: string, res: Response) => {
    res.status(status).json({ message });
  }),
}));

describe("validation/middleware/validate", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe("validate", () => {
    it("should validate body successfully", () => {
      const schema = z.object({ name: z.string() });
      mockRequest.body = { name: "John" };

      const middleware = validate({ body: schema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return error for invalid body", () => {
      const schema = z.object({ name: z.string() });
      mockRequest.body = { name: 123 };

      const middleware = validate({ body: schema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should validate query successfully", () => {
      const schema = z.object({ page: z.string() });
      mockRequest.query = { page: "1" };

      const middleware = validate({ query: schema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return error for invalid query", () => {
      const schema = z.object({ page: z.number() });
      mockRequest.query = { page: "invalid" };

      const middleware = validate({ query: schema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should validate params successfully", () => {
      const schema = z.object({ id: z.string() });
      mockRequest.params = { id: "123" };

      const middleware = validate({ params: schema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return error for invalid params", () => {
      const schema = z.object({ id: z.number() });
      mockRequest.params = { id: "invalid" };

      const middleware = validate({ params: schema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should validate multiple schemas successfully", () => {
      const bodySchema = z.object({ name: z.string() });
      const querySchema = z.object({ page: z.string() });
      mockRequest.body = { name: "John" };
      mockRequest.query = { page: "1" };

      const middleware = validate({ body: bodySchema, query: querySchema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should handle unexpected errors", () => {
      const schema = z.object({ name: z.string() });
      mockRequest.body = { name: "John" };

      // Force an error by making safeParse throw
      const middleware = validate({ body: schema });
      vi.spyOn(schema, "safeParse").mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should format multiple validation errors", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      mockRequest.body = { name: 123, age: "invalid" };

      const middleware = validate({ body: schema });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid request body"),
        })
      );
    });
  });

  describe("validateBody", () => {
    it("should validate body using helper function", () => {
      const schema = z.object({ name: z.string() });
      mockRequest.body = { name: "John" };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("validateQuery", () => {
    it("should validate query using helper function", () => {
      const schema = z.object({ page: z.string() });
      mockRequest.query = { page: "1" };

      const middleware = validateQuery(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("validateParams", () => {
    it("should validate params using helper function", () => {
      const schema = z.object({ id: z.string() });
      mockRequest.params = { id: "123" };

      const middleware = validateParams(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("validateBodyAndParams", () => {
    it("should validate body and params using helper function", () => {
      const bodySchema = z.object({ name: z.string() });
      const paramsSchema = z.object({ id: z.string() });
      mockRequest.body = { name: "John" };
      mockRequest.params = { id: "123" };

      const middleware = validateBodyAndParams(bodySchema, paramsSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("validateBodyAndQuery", () => {
    it("should validate body and query using helper function", () => {
      const bodySchema = z.object({ name: z.string() });
      const querySchema = z.object({ page: z.string() });
      mockRequest.body = { name: "John" };
      mockRequest.query = { page: "1" };

      const middleware = validateBodyAndQuery(bodySchema, querySchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("validateParamsAndQuery", () => {
    it("should validate params and query using helper function", () => {
      const paramsSchema = z.object({ id: z.string() });
      const querySchema = z.object({ page: z.string() });
      mockRequest.params = { id: "123" };
      mockRequest.query = { page: "1" };

      const middleware = validateParamsAndQuery(paramsSchema, querySchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("validateAll", () => {
    it("should validate all three using helper function", () => {
      const bodySchema = z.object({ name: z.string() });
      const querySchema = z.object({ page: z.string() });
      const paramsSchema = z.object({ id: z.string() });
      mockRequest.body = { name: "John" };
      mockRequest.query = { page: "1" };
      mockRequest.params = { id: "123" };

      const middleware = validateAll(bodySchema, querySchema, paramsSchema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
