import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import routes from '../providerReadRoutes';
import { authorizeUser } from '../../middleware/authMiddleware';
import { ProviderReadError } from '../../services/providerReads/store';
import { safeReads, marketReads } from '../../services/providerReads';

vi.mock('../../utils/dependenciesUtil', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => ({ address: '0x1111111111111111111111111111111111111111' })),
    },
  },
}));
vi.mock('../../services/providerReads', () => ({
  safeReads: { read: vi.fn(), invalidate: vi.fn() },
  marketReads: { read: vi.fn() },
}));

const app = express();
// Match the production server's rate-limit boundary before authentication.
app.use(rateLimit({ windowMs: 60_000, max: 120 }));
app.use('/external', authorizeUser, routes);
const token = () =>
  jwt.sign({ address: '0x1111111111111111111111111111111111111111' }, 'test-only-secret');

describe('Authenticated provider read boundary', () => {
  beforeEach(() => {
    process.env.SECRET_KEY = 'test-only-secret';
    vi.clearAllMocks();
  });

  it('rejects unauthenticated traffic before spending upstream quota', async () => {
    const response = await request(app).get('/external/market/simple/price?ids=ethereum');
    expect(response.status).toBe(401);
    expect(marketReads.read).not.toHaveBeenCalled();
  });

  it('restricts provider counters to administrators', async () => {
    const response = await request(app).get('/external/metrics').auth(token(), { type: 'bearer' });
    expect(response.status).toBe(403);
  });

  it('passes validated query strings through the authenticated read service', async () => {
    vi.mocked(safeReads.read).mockResolvedValue({ owners: [] });
    const response = await request(app)
      .get('/external/safe/137/api/v1/safes/0x1111111111111111111111111111111111111111/')
      .auth(token(), { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(safeReads.read).toHaveBeenCalledWith(
      137,
      'api/v1/safes/0x1111111111111111111111111111111111111111/',
      expect.any(URLSearchParams)
    );
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('returns a bounded cooldown that browsers can read without exposing provider details', async () => {
    vi.mocked(marketReads.read).mockRejectedValue(
      new ProviderReadError(429, 120, 'provider-cooldown')
    );
    const response = await request(app)
      .get('/external/market/simple/price?ids=ethereum')
      .auth(token(), { type: 'bearer' });
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('120');
    expect(response.headers['access-control-expose-headers']).toContain('Retry-After');
    expect(response.body).toEqual({ error: 'provider-cooldown', retryAfter: 120 });
  });

  it('rejects nested query values before calling an upstream service', async () => {
    const response = await request(app)
      .get('/external/market/simple/price?ids[]=ethereum')
      .auth(token(), { type: 'bearer' });
    expect(response.status).toBe(400);
    expect(marketReads.read).not.toHaveBeenCalled();
  });

  it('invalidates read caches without executing or replaying a signed transaction', async () => {
    vi.mocked(safeReads.invalidate).mockResolvedValue();
    const response = await request(app)
      .delete('/external/safe/137/cache/0x1111111111111111111111111111111111111111')
      .auth(token(), { type: 'bearer' });
    expect(response.status).toBe(200);
    expect(safeReads.invalidate).toHaveBeenCalledOnce();
    expect(safeReads.read).not.toHaveBeenCalled();
  });
});
