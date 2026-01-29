import { describe, expect, it } from 'vitest';
import {
  updateUserBodySchema,
  userPaginationQuerySchema,
  createUserBodySchema,
  userProfileSchema,
} from '../user';

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
        'At least one field (name, imageUrl or safe) must be provided for update'
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

  describe('createUserBodySchema', () => {
    it('should validate user creation with all fields', () => {
      const body = {
        name: 'John Doe',
        address: '0x1234567890123456789012345678901234567890',
        imageUrl: 'https://example.com/image.jpg',
      };
      const result = createUserBodySchema.parse(body);
      expect(result).toEqual(body);
    });

    it('should validate user creation without optional imageUrl', () => {
      const body = {
        name: 'John Doe',
        address: '0x1234567890123456789012345678901234567890',
      };
      const result = createUserBodySchema.parse(body);
      expect(result.name).toBe('John Doe');
      expect(result.address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should throw error for invalid address', () => {
      const body = {
        name: 'John Doe',
        address: 'invalid-address',
      };
      expect(() => createUserBodySchema.parse(body)).toThrow();
    });
  });

  describe('userProfileSchema', () => {
    it('should validate complete profile', () => {
      const profile = {
        name: 'John Doe',
        bio: 'Software developer',
        website: 'https://johndoe.com',
        twitter: '@johndoe',
        github: 'johndoe',
      };
      const result = userProfileSchema.parse(profile);
      expect(result).toEqual(profile);
    });

    it('should validate profile with minimum required fields', () => {
      const profile = { name: 'John Doe' };
      const result = userProfileSchema.parse(profile);
      expect(result.name).toBe('John Doe');
    });

    it('should throw error for name with HTML tags', () => {
      const profile = { name: 'John <script>alert(1)</script>' };
      expect(() => userProfileSchema.parse(profile)).toThrow('Name cannot contain HTML tags');
    });

    it('should throw error for bio exceeding 500 characters', () => {
      const profile = { name: 'John', bio: 'a'.repeat(501) };
      expect(() => userProfileSchema.parse(profile)).toThrow('Bio cannot exceed 500 characters');
    });

    it('should throw error for invalid Twitter handle', () => {
      const profile = { name: 'John', twitter: 'invalid handle with spaces' };
      expect(() => userProfileSchema.parse(profile)).toThrow('Invalid Twitter handle format');
    });

    it('should validate Twitter handle without @', () => {
      const profile = { name: 'John', twitter: 'johndoe' };
      const result = userProfileSchema.parse(profile);
      expect(result.twitter).toBe('johndoe');
    });

    it('should throw error for invalid GitHub username', () => {
      const profile = { name: 'John', github: 'invalid-username-' };
      expect(() => userProfileSchema.parse(profile)).toThrow('Invalid GitHub username format');
    });

    it('should validate GitHub username with hyphens', () => {
      const profile = { name: 'John', github: 'john-doe-dev' };
      const result = userProfileSchema.parse(profile);
      expect(result.github).toBe('john-doe-dev');
    });
  });
});
