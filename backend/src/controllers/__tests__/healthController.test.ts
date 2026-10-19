import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQueryRaw, mockGetChainId } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockGetChainId: vi.fn(),
}));

vi.mock('../../utils/dependenciesUtil', () => ({
  prisma: { $queryRaw: mockQueryRaw },
}));

vi.mock('../../utils/viem.config', () => ({
  default: { getChainId: mockGetChainId },
}));

import healthRoutes from '../../routes/healthRoutes';

const app = express();
app.use('/health', healthRoutes);

const originalChainId = process.env.CHAIN_ID;

describe('health routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHAIN_ID = '31337';
    mockQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockGetChainId.mockResolvedValue(31337);
  });

  afterAll(() => {
    if (originalChainId === undefined) delete process.env.CHAIN_ID;
    else process.env.CHAIN_ID = originalChainId;
  });

  it('keeps the process health check lightweight', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(mockQueryRaw).not.toHaveBeenCalled();
    expect(mockGetChainId).not.toHaveBeenCalled();
  });

  it('reports the database and matching chain as ready', async () => {
    const response = await request(app).get('/health/readiness');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      status: 'ready',
      checks: { database: 'ready', chain: 'ready' },
      chainId: 31337,
      expectedChainId: 31337,
    });
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(mockGetChainId).toHaveBeenCalledTimes(1);
  });

  it('returns not ready when the database cannot be reached', async () => {
    mockQueryRaw.mockRejectedValue(new Error('database unavailable'));

    const response = await request(app).get('/health/readiness');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      status: 'not_ready',
      checks: { database: 'unready', chain: 'ready' },
    });
    expect(response.body).not.toHaveProperty('message', 'database unavailable');
  });

  it('returns not ready when the observed chain differs from configuration', async () => {
    mockGetChainId.mockResolvedValue(1);

    const response = await request(app).get('/health/readiness');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      status: 'not_ready',
      checks: { database: 'ready', chain: 'unready' },
      chainId: 1,
      expectedChainId: 31337,
    });
  });
});
