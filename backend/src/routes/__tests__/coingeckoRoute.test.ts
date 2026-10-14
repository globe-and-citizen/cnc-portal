import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { MarketDataError } from '../../services/coingeckoService';
import coingeckoRoute from '../coingeckoRoute';
import { coinParams } from '../../validation/schemas/coingecko';

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('../../services/coingeckoService', async (original) => ({
  ...(await original<typeof import('../../services/coingeckoService')>()),
  getCoinGeckoData: mocks.load,
}));

const app = express();
app.use('/api/coingecko', coingeckoRoute);

beforeEach(() => {
  mocks.load
    .mockReset()
    .mockResolvedValue({ id: 'ethereum', market_data: { current_price: { usd: 2500.123456789 } } });
});
afterEach(() => vi.restoreAllMocks());

describe('CoinGecko backend boundary', () => {
  it.each(['.', '..'])(
    'rejects coin identity %s that would normalize to a different upstream path',
    (coinId) => {
      expect(coinParams.safeParse({ coinId }).success).toBe(false);
    }
  );
  it.each([
    ['/coins/Ethereum', { kind: 'coin', coinId: 'ethereum' }],
    [
      '/coins/ethereum/history?date=2026-10-03&localization=false',
      { kind: 'history', coinId: 'ethereum', date: '2026-10-03' },
    ],
    [
      '/coins/polygon-pos/contract/0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      { kind: 'contract', address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    ],
    [
      '/simple/price?ids=usd-coin,ethereum,ethereum&vs_currencies=usd',
      { kind: 'simple', ids: 'ethereum,usd-coin' },
    ],
  ])(
    'normalizes %s and returns the raw response without requiring a login',
    async (path, expected) => {
      const response = await request(app).get(`/api/coingecko${path}`);
      expect(response.status).toBe(200);
      expect(response.body.market_data.current_price.usd).toBe(2500.123456789);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(mocks.load).toHaveBeenCalledExactlyOnceWith(expected);
    }
  );

  it.each([
    '/coins/http%3A%2F%2Fexample.com',
    '/coins/ethereum?url=https://example.com',
    '/coins/polygon-pos/contract/invalid',
    '/coins/ethereum/history?date=2026-02-30',
    '/coins/ethereum/history?date=2099-01-01',
    '/coins/ethereum/history?date=2026-10-03&localization=true',
    '/simple/price?ids=ethereum&vs_currencies=eur',
    '/simple/price?ids=ethereum&ids=bitcoin&vs_currencies=usd',
    `/simple/price?ids=${Array.from({ length: 26 }, (_, i) => `coin-${i}`).join(',')}&vs_currencies=usd`,
  ])('rejects unsupported input %s before invoking the cache or provider', async (path) => {
    const response = await request(app).get(`/api/coingecko${path}`);
    expect(response.status).toBe(400);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it('returns the shared 429 status and retry window', async () => {
    mocks.load.mockRejectedValueOnce(
      new MarketDataError(429, 'Market provider is rate limited', 90)
    );
    const response = await request(app).get('/api/coingecko/coins/ethereum');
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('90');
    expect(response.body).toEqual({ message: 'Market provider is rate limited' });
  });

  it('does not expose internal connection or provider details', async () => {
    mocks.load.mockRejectedValueOnce(new Error('private credentials'));
    const response = await request(app).get('/api/coingecko/coins/ethereum');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: 'Market data is unavailable' });
  });
});
