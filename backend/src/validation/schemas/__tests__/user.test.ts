import { describe, expect, it } from 'vitest';
import { updateUserBodySchema, userPaginationQuerySchema } from '../user';

describe('user schemas', () => {
  describe('updateUserBodySchema', () => {
    it('should validate update with name only', () => {
      const body = { name: 'John Doe' };
      const result = updateUserBodySchema.parse(body);
      expect(result.name).toBe('John Doe');
    });

    it('should validate update with imageUrl only', () => {
      const body = { imageUrl: 'https://example.com/image.jpg' };
      const result = updateUserBodySchema.parse(body);
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should validate update with both name and imageUrl', () => {
      const body = { name: 'John Doe', imageUrl: 'https://example.com/image.jpg' };
      const result = updateUserBodySchema.parse(body);
      expect(result.name).toBe('John Doe');
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should throw error if no fields provided', () => {
      const body = {};
      expect(() => updateUserBodySchema.parse(body)).toThrow(
        'At least one field (name or imageUrl) must be provided for update'
      );
    });

    it('should throw error for name exceeding 100 characters', () => {
      const body = { name: 'a'.repeat(101) };
      expect(() => updateUserBodySchema.parse(body)).toThrow('Name cannot exceed 100 characters');
    });
  });

  describe('userPaginationQuerySchema', () => {
    it('should use default values', () => {
      const query = {};
      const result = userPaginationQuerySchema.parse(query);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should validate custom page and limit', () => {
      const query = { page: '5', limit: '20' };
      const result = userPaginationQuerySchema.parse(query);
      expect(result.page).toBe(5);
      expect(result.limit).toBe(20);
    });

    it('should coerce string numbers to integers', () => {
      const query = { page: '3', limit: '15' };
      const result = userPaginationQuerySchema.parse(query);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
    });

    it('should throw error for page less than 1', () => {
      const query = { page: '0' };
      expect(() => userPaginationQuerySchema.parse(query)).toThrow('Page must be at least 1');
    });

    it('should throw error for limit exceeding 100', () => {
      const query = { limit: '101' };
      expect(() => userPaginationQuerySchema.parse(query)).toThrow('Maximum limit is 100');
    });

    it('should throw error for non-integer page', () => {
      const query = { page: '1.5' };
      expect(() => userPaginationQuerySchema.parse(query)).toThrow('Page must be an integer');
    });
  });
});
