import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  // createEnumWithFallback,
  createOptimizedObjectSchema,
  createAsyncValidationSchema,
  createTransformSchema,
  createMultiRefinedSchema,
  createPerformanceTrackedSchema,
  createCachedValidationSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  slugSchema,
  dateRangeSchema,
} from '../../validation/utils';

describe('validation/utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // describe('createEnumWithFallback', () => {
  //   it('should return valid enum value', () => {
  //     const schema = createEnumWithFallback(['active', 'inactive'], 'active');
  //     const result = schema.parse('active');
  //     expect(result).toBe('active');
  //   });

  //   it('should return fallback for invalid value', () => {
  //     const schema = createEnumWithFallback(['active', 'inactive'], 'active');
  //     const result = schema.parse('invalid');
  //     expect(result).toBe('active');
  //   });

  //   it('should handle multiple enum values', () => {
  //     const schema = createEnumWithFallback(['red', 'green', 'blue'], 'red');
  //     expect(schema.parse('green')).toBe('green');
  //     expect(schema.parse('blue')).toBe('blue');
  //     expect(schema.parse('yellow')).toBe('red');
  //   });
  // });

  describe('createOptimizedObjectSchema', () => {
    it('should create basic object schema', () => {
      const schema = createOptimizedObjectSchema({
        name: z.string(),
        age: z.number(),
      });

      const result = schema.parse({ name: 'John', age: 30 });
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should create strict schema', () => {
      const schema = createOptimizedObjectSchema(
        {
          name: z.string(),
        },
        { strict: true }
      );

      expect(() => schema.parse({ name: 'John', extra: 'field' })).toThrow();
    });

    it('should create passthrough schema', () => {
      const schema = createOptimizedObjectSchema(
        {
          name: z.string(),
        },
        { passthrough: true }
      );

      const result = schema.parse({ name: 'John', extra: 'field' });
      expect(result).toEqual({ name: 'John', extra: 'field' });
    });

    it('should create strip schema', () => {
      const schema = createOptimizedObjectSchema(
        {
          name: z.string(),
        },
        { strip: true }
      );

      const result = schema.parse({ name: 'John', extra: 'field' });
      expect(result).toEqual({ name: 'John' });
    });
  });

  describe('createAsyncValidationSchema', () => {
    it('should validate with async validator', async () => {
      const asyncValidator = vi.fn(async (data: string) => data.length > 5);
      const schema = createAsyncValidationSchema(
        z.string(),
        asyncValidator,
        'Must be longer than 5 characters'
      );

      const result = await schema.parseAsync('test123');
      expect(result).toBe('test123');
      expect(asyncValidator).toHaveBeenCalledWith('test123');
    });

    it('should fail with async validator', async () => {
      const asyncValidator = vi.fn(async (data: string) => data.length > 5);
      const schema = createAsyncValidationSchema(
        z.string(),
        asyncValidator,
        'Must be longer than 5 characters'
      );

      await expect(schema.parseAsync('test')).rejects.toThrow();
    });
  });

  describe('createTransformSchema', () => {
    it('should transform data synchronously', () => {
      const schema = createTransformSchema(z.string(), (data) => data.toUpperCase());

      const result = schema.parse('hello');
      expect(result).toBe('HELLO');
    });

    it('should transform data asynchronously', async () => {
      const schema = createTransformSchema(z.string(), async (data) => data.toUpperCase());

      const result = await schema.parseAsync('hello');
      expect(result).toBe('HELLO');
    });
  });

  describe('createMultiRefinedSchema', () => {
    it('should apply multiple refinements', () => {
      const schema = createMultiRefinedSchema(z.number(), [
        {
          predicate: (num) => num > 0,
          message: 'Must be positive',
        },
        {
          predicate: (num) => num < 100,
          message: 'Must be less than 100',
        },
      ]);

      expect(schema.parse(50)).toBe(50);
      expect(() => schema.parse(-1)).toThrow('Must be positive');
      expect(() => schema.parse(101)).toThrow('Must be less than 100');
    });

    it('should support path in refinements', () => {
      const schema = createMultiRefinedSchema(z.number(), [
        {
          predicate: (num) => num > 0,
          message: 'Must be positive',
          path: ['value'],
        },
      ]);

      expect(() => schema.parse(-1)).toThrow();
    });
  });

  describe('emailSchema', () => {
    it('should validate correct email', () => {
      const result = emailSchema.parse('test@example.com');
      expect(result).toBe('test@example.com');
    });

    it('should convert email to lowercase', () => {
      const result = emailSchema.parse('TEST@EXAMPLE.COM');
      expect(result).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      expect(() => emailSchema.parse('invalid-email')).toThrow();
    });

    it('should reject email with extra whitespace in the middle', () => {
      expect(() => emailSchema.parse('test @example.com')).toThrow();
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong password', () => {
      const result = passwordSchema.parse('Test123!@#');
      expect(result).toBe('Test123!@#');
    });

    it('should reject short password', () => {
      expect(() => passwordSchema.parse('Test1!')).toThrow('at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      expect(() => passwordSchema.parse('test123!@#')).toThrow();
    });

    it('should reject password without lowercase', () => {
      expect(() => passwordSchema.parse('TEST123!@#')).toThrow();
    });

    it('should reject password without number', () => {
      expect(() => passwordSchema.parse('Test!@#$%')).toThrow();
    });

    it('should reject password without special character', () => {
      expect(() => passwordSchema.parse('Test1234567')).toThrow();
    });
  });

  describe('phoneSchema', () => {
    it('should validate international phone number', () => {
      const result = phoneSchema.parse('+1234567890');
      expect(result).toBe('+1234567890');
    });

    it('should validate phone without plus', () => {
      const result = phoneSchema.parse('1234567890');
      expect(result).toBe('1234567890');
    });

    it('should accept short but valid phone', () => {
      const result = phoneSchema.parse('123');
      expect(result).toBe('123');
    });

    it('should reject phone with letters', () => {
      expect(() => phoneSchema.parse('+123abc4567')).toThrow();
    });

    it('should reject phone starting with 0', () => {
      expect(() => phoneSchema.parse('+0123456789')).toThrow();
    });
  });

  describe('slugSchema', () => {
    it('should validate valid slug', () => {
      const result = slugSchema.parse('my-valid-slug');
      expect(result).toBe('my-valid-slug');
    });

    it('should validate slug with numbers', () => {
      const result = slugSchema.parse('slug-123');
      expect(result).toBe('slug-123');
    });

    it('should reject empty slug', () => {
      expect(() => slugSchema.parse('')).toThrow('cannot be empty');
    });

    it('should reject slug with uppercase', () => {
      expect(() => slugSchema.parse('My-Slug')).toThrow();
    });

    it('should reject slug with spaces', () => {
      expect(() => slugSchema.parse('my slug')).toThrow();
    });

    it('should reject slug with special characters', () => {
      expect(() => slugSchema.parse('my_slug!')).toThrow();
    });
  });

  describe('dateRangeSchema', () => {
    it('should validate valid date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = dateRangeSchema.parse({ startDate, endDate });
      expect(result.startDate).toEqual(startDate);
      expect(result.endDate).toEqual(endDate);
    });

    it('should reject invalid date range (end before start)', () => {
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');

      expect(() => dateRangeSchema.parse({ startDate, endDate })).toThrow(
        'End date must be after start date'
      );
    });

    it('should reject same start and end date', () => {
      const date = new Date('2024-01-01');

      expect(() => dateRangeSchema.parse({ startDate: date, endDate: date })).toThrow();
    });
  });

  describe('createPerformanceTrackedSchema', () => {
    it('should track validation performance', () => {
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });

      const schema = createPerformanceTrackedSchema(z.string(), 'testSchema');
      const result = schema.parse('test');

      expect(result).toBe('test');

      consoleDebugSpy.mockRestore();
    });
  });

  describe('createCachedValidationSchema', () => {
    it('should cache validation results', () => {
      const schema = createCachedValidationSchema(z.object({ name: z.string() }));

      const data = { name: 'John' };
      const result1 = schema.parse(data);
      const result2 = schema.parse(data);

      expect(result1).toEqual(data);
      expect(result2).toEqual(data);
    });

    it('should use custom cache options', () => {
      const schema = createCachedValidationSchema(z.object({ name: z.string() }), {
        maxSize: 10,
        ttl: 1000,
      });

      const data = { name: 'Jane' };
      const result = schema.parse(data);

      expect(result).toEqual(data);
    });

    it('should cache different values separately', () => {
      const schema = createCachedValidationSchema(z.string());

      const result1 = schema.parse('value1');
      const result2 = schema.parse('value2');

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
    });
  });

  describe('ValidationCache', () => {
    it('should handle cache size limits', () => {
      const schema = createCachedValidationSchema(z.number(), { maxSize: 2 });

      schema.parse(1);
      schema.parse(2);
      schema.parse(3); // Should evict first entry

      // All should still work
      expect(schema.parse(2)).toBe(2);
      expect(schema.parse(3)).toBe(3);
    });

    it('should handle TTL expiration', async () => {
      const schema = createCachedValidationSchema(z.string(), { ttl: 10 }); // 10ms TTL

      const value = 'test';
      schema.parse(value);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Should still work but might not use cache
      expect(schema.parse(value)).toBe(value);
    });
  });
});
