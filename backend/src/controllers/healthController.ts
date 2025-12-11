import { Request, Response } from 'express';

/**
 * Lightweight health check endpoint
 * Returns basic service status without exposing database internals
 */
export const healthCheck = (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'backend',
  });
};
