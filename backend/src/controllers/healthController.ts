import { Request, Response } from 'express';
import { prisma } from '../utils/dependenciesUtil';
import publicClient from '../utils/viem.config';

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

type ReadinessStatus = 'ready' | 'unready';

const configuredChainId = (): number | null => {
  const value = process.env.CHAIN_ID;
  if (!value) return null;

  const parsed = value.startsWith('0x') ? Number.parseInt(value, 16) : Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

/**
 * Verifies the dependencies required by an integrated E2E journey.
 * Deliberately exposes statuses, not database or RPC error details.
 */
export const readinessCheck = async (_req: Request, res: Response) => {
  let databaseStatus: ReadinessStatus = 'unready';
  let observedChainId: number | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = 'ready';
  } catch {
    // Keep dependency details out of the public readiness response.
  }

  try {
    observedChainId = await publicClient.getChainId();
  } catch {
    // Keep dependency details out of the public readiness response.
  }

  const expectedChainId = configuredChainId();
  const chainStatus: ReadinessStatus =
    observedChainId !== null && expectedChainId !== null && observedChainId === expectedChainId
      ? 'ready'
      : 'unready';
  const ready = databaseStatus === 'ready' && chainStatus === 'ready';

  return res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? 'ready' : 'not_ready',
    checks: {
      database: databaseStatus,
      chain: chainStatus,
    },
    chainId: observedChainId,
    expectedChainId,
    timestamp: new Date().toISOString(),
    service: 'backend',
  });
};
