import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  addExpenseBodySchema,
  getExpensesQuerySchema,
  updateExpenseBodySchema,
  updateExpenseParamsSchema,
} from '../expense';

describe('expense schemas', () => {
  describe('addExpenseBodySchema', () => {
    it('should validate expense with valid data structure', () => {
      const validData = {
        teamId: '1',
        signature: '0xsignature',
        data: {
          approvedAddress: '0x1234567890123456789012345678901234567890',
          budgetData: [
            { budgetType: 0, value: 100 },
            { budgetType: 1, value: 200 },
          ],
          tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          expiry: 1640995200,
        },
      };

      const result = addExpenseBodySchema.parse(validData);
      expect(result.data.approvedAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(result.data.budgetData).toHaveLength(2);
      expect(result.data.tokenAddress).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef');
      expect(result.data.expiry).toBe(1640995200);
    });

    it('should throw error for missing required fields in data', () => {
      const invalidData = {
        teamId: '1',
        signature: '0xsignature',
        data: {
          approvedAddress: '0x1234567890123456789012345678901234567890',
          // Missing budgetData, tokenAddress, and expiry
        },
      };

      expect(() => addExpenseBodySchema.parse(invalidData)).toThrow();
    });

    it('should throw error for empty budgetData array', () => {
      const invalidData = {
        teamId: '1',
        signature: '0xsignature',
        data: {
          approvedAddress: '0x1234567890123456789012345678901234567890',
          budgetData: [], // Empty array should fail
          tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          expiry: 1640995200,
        },
      };

      expect(() => addExpenseBodySchema.parse(invalidData)).toThrow(
        'budgetData must have at least one entry'
      );
    });

    it('should throw error for empty signature', () => {
      const invalidData = {
        teamId: '1',
        signature: '',
        data: {
          approvedAddress: '0x1234567890123456789012345678901234567890',
          budgetData: [{ budgetType: 0, value: 100 }],
          tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          expiry: 1640995200,
        },
      };

      expect(() => addExpenseBodySchema.parse(invalidData)).toThrow('Signature cannot be empty');
    });

    it('should throw error for negative values in budgetData', () => {
      const invalidData = {
        teamId: '1',
        signature: '0xsignature',
        data: {
          approvedAddress: '0x1234567890123456789012345678901234567890',
          budgetData: [{ budgetType: 0, value: -100 }], // Negative value should fail
          tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          expiry: 1640995200,
        },
      };

      expect(() => addExpenseBodySchema.parse(invalidData)).toThrow();
    });

    it('should throw error for empty approvedAddress', () => {
      const invalidData = {
        teamId: '1',
        signature: '0xsignature',
        data: {
          approvedAddress: '', // Empty string should fail
          budgetData: [{ budgetType: 0, value: 100 }],
          tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          expiry: 1640995200,
        },
      };

      expect(() => addExpenseBodySchema.parse(invalidData)).toThrow('approvedAddress is required');
    });
  });

  describe('getExpensesQuerySchema', () => {
    it('should validate query with default status', () => {
      const query = { teamId: '1' };
      const result = getExpensesQuerySchema.parse(query);
      expect(result.status).toBe('all');
    });

    it('should validate query with explicit status', () => {
      const query = { teamId: '1', status: 'pending' };
      const result = getExpensesQuerySchema.parse(query);
      expect(result.status).toBe('pending');
    });

    it('should accept all valid status values', () => {
      const statuses = ['all', 'pending', 'approved', 'rejected', 'disabled', 'enabled', 'signed'];

      statuses.forEach((status) => {
        const query = { teamId: '1', status };
        const result = getExpensesQuerySchema.parse(query);
        expect(result.status).toBe(status);
      });
    });

    it('should throw error for invalid status', () => {
      const query = { teamId: '1', status: 'invalid' };
      expect(() => getExpensesQuerySchema.parse(query)).toThrow('Invalid status parameter');
    });
  });

  describe('updateExpenseBodySchema', () => {
    it('should validate update with disable status', () => {
      const body = { status: 'disable' };
      const result = updateExpenseBodySchema.parse(body);
      expect(result.status).toBe('disable');
    });

    it('should validate update with expired status', () => {
      const body = { status: 'expired' };
      const result = updateExpenseBodySchema.parse(body);
      expect(result.status).toBe('expired');
    });

    it('should validate update with limitReached status', () => {
      const body = { status: 'limitReached' };
      const result = updateExpenseBodySchema.parse(body);
      expect(result.status).toBe('limitReached');
    });

    it('should throw error for invalid status', () => {
      const body = { status: 'invalid' };
      expect(() => updateExpenseBodySchema.parse(body)).toThrow(
        'Invalid status. Allowed values: disable, expired, limitReached'
      );
    });
  });

  describe('updateExpenseParamsSchema', () => {
    it('should validate positive integer ID', () => {
      const params = { id: '123' };
      const result = updateExpenseParamsSchema.parse(params);
      expect(result.id).toBe(123);
    });

    it('should throw error for non-positive ID', () => {
      const params = { id: '0' };
      expect(() => updateExpenseParamsSchema.parse(params)).toThrow();
    });

    it('should throw error for negative ID', () => {
      const params = { id: '-1' };
      expect(() => updateExpenseParamsSchema.parse(params)).toThrow();
    });
  });
});
