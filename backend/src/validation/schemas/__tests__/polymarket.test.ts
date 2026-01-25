import { describe, it, expect } from 'vitest';
import { gammaPathSchema } from '../polymarket';

describe('gammaPathSchema', () => {
  // --- Success Cases ---
  describe('Valid Paths', () => {
    it('should pass and prepend a slash if missing', () => {
      const result = gammaPathSchema.safeParse({ url: 'markets' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toBe('/markets');
      }
    });

    it('should pass and maintain an existing leading slash', () => {
      const result = gammaPathSchema.safeParse({ url: '/trades/123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toBe('/trades/123');
      }
    });

    it('should trim whitespace from the input', () => {
      const result = gammaPathSchema.safeParse({ url: '  /orders  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toBe('/orders');
      }
    });
  });

  // --- Failure Cases ---
  describe('Invalid Paths & Security', () => {
    it('should fail if the url query parameter is missing', () => {
      const result = gammaPathSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Invalid input: expected string, received undefined'
        );
      }
    });

    it('should reject path traversal attempts (..)', () => {
      const result = gammaPathSchema.safeParse({ url: '/markets/../../etc/passwd' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Path traversal');
      }
    });

    it('should reject backslashes', () => {
      const result = gammaPathSchema.safeParse({ url: '/markets\\secret' });
      expect(result.success).toBe(false);
    });

    it('should reject paths that do not start with allowed prefixes', () => {
      const result = gammaPathSchema.safeParse({ url: '/unauthorized-endpoint' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Disallowed API prefix');
      }
    });

    it('should reject empty strings', () => {
      const result = gammaPathSchema.safeParse({ url: '' });
      expect(result.success).toBe(false);
    });
  });
});
