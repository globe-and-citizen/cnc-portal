import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { errorResponse, extractAddressAndNonce } from '../utils';

describe('utils', () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('errorResponse', () => {
    it('should return error message for non-500 string error', () => {
      errorResponse(400, 'Bad request', mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Bad request',
      });
    });

    it('should return error message for non-500 Error instance', () => {
      const error = new Error('Validation failed');
      errorResponse(403, error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Validation failed',
      });
    });

    it('should return generic message for 500 error with string', () => {
      errorResponse(500, 'Database error', mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });

    it('should return generic message for 500 error with Error instance', () => {
      const error = new Error('Database connection failed');
      errorResponse(500, error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: 'Database connection failed',
      });
    });

    it('should log error stack in non-test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleLogSpy = vi.spyOn(console, 'log');

      const error = new Error('Test error');
      errorResponse(500, error, mockResponse as Response);

      expect(consoleLogSpy).toHaveBeenCalledWith('process.env.NODE_ENV', 'development');
      expect(consoleLogSpy).toHaveBeenCalledWith(error.stack);

      process.env.NODE_ENV = originalEnv;
      consoleLogSpy.mockRestore();
    });

    it('should log non-Error objects in non-test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleLogSpy = vi.spyOn(console, 'log');

      const error = { code: 'ERR_123', message: 'Custom error' };
      errorResponse(500, error, mockResponse as Response);

      expect(consoleLogSpy).toHaveBeenCalledWith(error);

      process.env.NODE_ENV = originalEnv;
      consoleLogSpy.mockRestore();
    });

    it('should handle error without message property for 500', () => {
      const error = { customProperty: 'value' };
      errorResponse(500, error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });
  });

  describe('extractAddressAndNonce', () => {
    it('should extract address and nonce from valid message', () => {
      const message = `Welcome to our platform!
0x1234567890123456789012345678901234567890
Please sign this message
Nonce: abc123`;

      const result = extractAddressAndNonce(message);

      expect(result).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        nonce: 'abc123',
      });
    });

    it('should extract address and nonce with extra whitespace', () => {
      const message = `Welcome
  0x1234567890123456789012345678901234567890  
Sign this
Nonce:   xyz789  `;

      const result = extractAddressAndNonce(message);

      expect(result).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        nonce: 'xyz789',
      });
    });

    it('should throw error if address is missing', () => {
      const message = `Welcome to our platform!
Please sign this message
Nonce: abc123`;

      expect(() => extractAddressAndNonce(message)).toThrow(
        'Extract address error: Eth address missing'
      );
    });

    it('should throw error if nonce is missing', () => {
      const message = `Welcome to our platform!
0x1234567890123456789012345678901234567890
Please sign this message`;

      expect(() => extractAddressAndNonce(message)).toThrow('Extract nonce error: Nonce missing');
    });

    it('should handle address on first line', () => {
      const message = `0x1234567890123456789012345678901234567890
Welcome to our platform!
Nonce: test123`;

      const result = extractAddressAndNonce(message);

      expect(result).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        nonce: 'test123',
      });
    });

    it('should handle nonce on first occurrence', () => {
      const message = `Welcome
Nonce: first-nonce
0x1234567890123456789012345678901234567890
Nonce: second-nonce`;

      const result = extractAddressAndNonce(message);

      expect(result).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        nonce: 'first-nonce',
      });
    });

    it('should reject invalid address length', () => {
      const message = `Welcome
0x12345
Nonce: test123`;

      expect(() => extractAddressAndNonce(message)).toThrow(
        'Extract address error: Eth address missing'
      );
    });

    it('should handle nonce with special characters', () => {
      const message = `Welcome
0x1234567890123456789012345678901234567890
Nonce: value_with-special.chars`;

      const result = extractAddressAndNonce(message);

      expect(result).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        nonce: 'value_with-special.chars',
      });
    });
  });
});
