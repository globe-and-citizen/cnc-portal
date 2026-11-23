import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { errorResponse } from '../utils';

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setTag: vi.fn(),
  withScope: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  captureException: sentryMocks.captureException,
  captureMessage: sentryMocks.captureMessage,
  withScope: sentryMocks.withScope,
}));

describe('utils', () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    sentryMocks.withScope.mockImplementation((callback: (scope: unknown) => void) =>
      callback({ setTag: sentryMocks.setTag })
    );
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('errorResponse', () => {
    it('does not capture client errors', () => {
      errorResponse(400, 'Bad request', mockResponse as Response);

      expect(sentryMocks.withScope).not.toHaveBeenCalled();
    });

    it('returns error message for non-500 string error', () => {
      errorResponse(400, 'Bad request', mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Bad request',
      });
    });

    it('returns error message for non-500 Error instance', () => {
      const error = new Error('Validation failed');
      errorResponse(403, error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Validation failed',
      });
    });

    it('returns generic message for 500 error with string', () => {
      errorResponse(500, 'Database error', mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });

    it('returns generic message for 500 error with Error instance', () => {
      const error = new Error('Database connection failed');
      errorResponse(500, error, mockResponse as Response);

      expect(sentryMocks.captureException).toHaveBeenCalledWith(error);
      expect(sentryMocks.setTag).toHaveBeenCalledWith('runtime', 'backend');
      expect(sentryMocks.setTag).toHaveBeenCalledWith('error.source', 'errorResponse');
      expect(sentryMocks.setTag).toHaveBeenCalledWith('http.status_code', '500');
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: 'Database connection failed',
      });
    });

    it('captures a non-Error server failure as a Sentry message', () => {
      errorResponse(503, 'Provider unavailable', mockResponse as Response);

      expect(sentryMocks.captureMessage).toHaveBeenCalledWith('Provider unavailable', 'error');
    });

    it('logs error stack in non-test environment', () => {
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

    it('logs non-Error objects in non-test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleLogSpy = vi.spyOn(console, 'log');

      const error = { code: 'ERR_123', message: 'Custom error' };
      errorResponse(500, error, mockResponse as Response);

      expect(consoleLogSpy).toHaveBeenCalledWith(error);

      process.env.NODE_ENV = originalEnv;
      consoleLogSpy.mockRestore();
    });

    it('handles error without message property for 500', () => {
      const error = { customProperty: 'value' };
      errorResponse(500, error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });
  });
});
