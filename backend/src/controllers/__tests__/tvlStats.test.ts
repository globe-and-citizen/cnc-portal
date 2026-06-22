import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeUser } from '../../middleware/authMiddleware';
import statsRoutes from '../../routes/statsRoute';
import { prisma } from '../../utils';
import publicClient from '../../utils/viem.config';

// Mock the authorizeUser middleware so requests pass straight through.
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, _res: Response, next: NextFunction) => {
    req.address = '0x1234567890123456789012345678901234567890';
    next();
  }),
}));

// Mock prisma.
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      team: {
        findMany: vi.fn(),
      },
    },
  };
});

// Mock the on-chain client.
vi.mock('../../utils/viem.config', () => ({
  default: {
    chain: { id: 137 },
    getBalance: vi.fn(),
    multicall: vi.fn(),
    readContract: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/stats', authorizeUser, statsRoutes);

// Polygon USDC address (lowercased) the controller values.
const USDC = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';

describe('GET /stats/tvl', () => {
  const originalFetch = global.fetch;
  // Monotonic fake clock, advanced past the cache TTL before each test.
  let mockNow = new Date('2030-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    vi.clearAllMocks();
    // The controller caches the snapshot in module scope for 60s. Fake only the
    // clock (not timers, to leave async I/O alone) and jump well past the TTL
    // each test so every test recomputes instead of reading a stale cache.
    vi.useFakeTimers({ toFake: ['Date'] });
    mockNow += 10 * 60_000;
    vi.setSystemTime(mockNow);
    process.env.PONDER_URL = 'http://ponder.test';

    vi.mocked(prisma.team.findMany).mockResolvedValue([
      { id: 1, name: 'Alpha', teamContracts: [{ address: '0xBANK1' }] },
      { id: 2, name: 'Beta', teamContracts: [{ address: '0xBANK2' }] },
    ] as never);

    // Native: bank1 holds 1 POL, bank2 holds nothing.
    vi.mocked(publicClient.getBalance)
      .mockResolvedValueOnce(1_000000000000000000n)
      .mockResolvedValueOnce(0n);

    // Token balanceOf, flattened as [bank1×(USDC,USDCe,USDT), bank2×(...)].
    vi.mocked(publicClient.multicall).mockResolvedValue([
      { status: 'success', result: 1_000000n }, // bank1 USDC = 1 USDC
      { status: 'success', result: 0n }, // bank1 USDCe
      { status: 'success', result: 2_000000n }, // bank1 USDT = 2 USDT
      { status: 'success', result: 0n }, // bank2 USDC
      { status: 'success', result: 0n }, // bank2 USDCe
      { status: 'success', result: 0n }, // bank2 USDT
    ] as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    delete process.env.PONDER_URL;
  });

  it('aggregates on-chain balances and ponder transfer volume per team and globally', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totals: { native: '500', tokens: { [USDC]: '3000000' } },
        byContract: [{ contractAddress: '0xbank1', native: '500', tokens: { [USDC]: '3000000' } }],
      }),
    }) as never;

    const res = await request(app).get('/stats/tvl');

    expect(res.status).toBe(200);
    expect(res.body.chainId).toBe(137);
    expect(res.body.transferredAvailable).toBe(true);

    // Global TVL = sum across both banks.
    expect(res.body.totals.tvlRaw.native).toBe('1000000000000000000');
    expect(res.body.totals.tvlRaw.USDC).toBe('1000000');
    expect(res.body.totals.tvlRaw.USDT).toBe('2000000');

    // Per-team TVL.
    const alpha = res.body.teams.find((t: { teamId: number }) => t.teamId === 1);
    const beta = res.body.teams.find((t: { teamId: number }) => t.teamId === 2);
    expect(alpha.tvlRaw.native).toBe('1000000000000000000');
    expect(alpha.tvlRaw.USDT).toBe('2000000');
    expect(alpha.bankAddresses).toEqual(['0xbank1']);
    expect(beta.tvlRaw.native).toBe('0');
    expect(beta.tvlRaw.USDC).toBe('0');

    // Transfer volume mapped from ponder onto the owning team + global.
    expect(res.body.totals.transferredRaw.USDC).toBe('3000000');
    expect(res.body.totals.transferredRaw.native).toBe('500');
    expect(alpha.transferredRaw.USDC).toBe('3000000');
    expect(beta.transferredRaw.USDC).toBe('0');
  });

  it('degrades gracefully when ponder is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;

    const res = await request(app).get('/stats/tvl');

    expect(res.status).toBe(200);
    expect(res.body.transferredAvailable).toBe(false);
    expect(res.body.totals.transferredRaw.USDC).toBe('0');
    expect(res.body.totals.transferredRaw.native).toBe('0');
    // TVL is still computed from on-chain reads.
    expect(res.body.totals.tvlRaw.native).toBe('1000000000000000000');
  });
});
