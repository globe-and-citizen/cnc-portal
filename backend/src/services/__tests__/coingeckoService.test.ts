import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCoinGeckoData, MarketDataError } from '../coingeckoService';

const mocks = vi.hoisted(() => ({ getRedis: vi.fn() }));
vi.mock('../marketRedisService', () => ({ getMarketRedis: mocks.getRedis }));
vi.mock('node:timers/promises', () => ({
  setTimeout: (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}));

const coin = { id: 'ethereum', market_data: { current_price: { usd: 2500.123456789, eur: 2300 } } };
const contract = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

/** Shared expiring store simulates independent backend callers, not a local result cache. */
function createCache() {
  const values = new Map<string, { value: string; until: number }>();
  const read = (key: string) => {
    const entry = values.get(key);
    if (entry && entry.until <= Date.now()) values.delete(key);
    return values.get(key);
  };
  const cache = {
    get: vi.fn(async (key: string) => read(key)?.value ?? null),
    del: vi.fn(async (key: string) => Number(values.delete(key))),
    pTTL: vi.fn(async (key: string) => (read(key) ? read(key)!.until - Date.now() : -2)),
    set: vi.fn(
      async (key: string, value: string, options: { NX?: boolean; PX?: number; EX?: number }) => {
        if (options.NX && read(key)) return null;
        values.set(key, { value, until: Date.now() + (options.PX ?? options.EX! * 1000) });
        return 'OK';
      }
    ),
    eval: vi.fn(async (_script: string, options: { keys: string[]; arguments: string[] }) => {
      const [key, admission] = options.keys;
      const [argument] = options.arguments;
      if (admission) {
        const cooldown = await cache.pTTL(key);
        if (cooldown > 0) return -cooldown;
        if (await cache.set(admission, '1', { NX: true, PX: Number(argument) })) return 0;
        return cache.pTTL(admission);
      }
      if (key.endsWith(':cooldown')) {
        if ((await cache.pTTL(key)) < Number(argument))
          await cache.set(key, '1', { PX: Number(argument) });
        return 1;
      }
      if ((await cache.get(key)) === argument) return cache.del(key);
      return 0;
    }),
    withCommandOptions: vi.fn(),
  };
  cache.withCommandOptions.mockReturnValue(cache);
  return cache;
}

let cache: ReturnType<typeof createCache>;
let provider: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
  vi.stubEnv('COINGECKO_API_PLAN', 'demo');
  vi.stubEnv('COINGECKO_API_KEY', '');
  vi.stubEnv('COINGECKO_REQUEST_INTERVAL_MS', '2100');
  cache = createCache();
  mocks.getRedis.mockReset().mockResolvedValue(cache);
  provider = vi.fn().mockImplementation(async () => new Response(JSON.stringify(coin)));
  vi.stubGlobal('fetch', provider);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('shared CoinGecko market cache', () => {
  it('reuses an unchanged response across callers and refreshes after its TTL', async () => {
    expect(await getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).toEqual(coin);
    expect(await getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).toEqual(coin);
    expect(provider).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 60001);
    const updated = { ...coin, market_data: { current_price: { usd: 2600 } } };
    provider.mockResolvedValueOnce(new Response(JSON.stringify(updated)));
    expect(await getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).toEqual(updated);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('fetches one response for simultaneous cold-cache callers', async () => {
    let resolveProvider!: (value: Response) => void;
    provider.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProvider = resolve;
        })
    );
    const first = getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' });
    const second = getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' });
    await vi.advanceTimersByTimeAsync(0);
    expect(provider).toHaveBeenCalledTimes(1);
    resolveProvider(new Response(JSON.stringify(coin)));
    await vi.advanceTimersByTimeAsync(100);
    expect(await Promise.all([first, second])).toEqual([coin, coin]);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('paces distinct cold keys through the shared provider slot', async () => {
    provider
      .mockResolvedValueOnce(new Response(JSON.stringify(coin)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...coin, id: 'bitcoin' })));
    await getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' });
    const next = getCoinGeckoData({ kind: 'coin', coinId: 'bitcoin' });
    await vi.advanceTimersByTimeAsync(2099);
    expect(provider).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(101);
    expect(await next).toMatchObject({ id: 'bitcoin' });
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('keeps historical dates separate and retains exact historical response precision', async () => {
    await getCoinGeckoData({ kind: 'history', coinId: 'ethereum', date: '2026-10-03' });
    const url = provider.mock.calls[0][0] as URL;
    expect(url.searchParams.get('date')).toBe('2026-10-03');
    expect(url.searchParams.get('localization')).toBe('false');
    vi.setSystemTime(Date.now() + 86400000);
    expect(
      await getCoinGeckoData({ kind: 'history', coinId: 'ethereum', date: '2026-10-03' })
    ).toEqual(coin);
    expect(provider).toHaveBeenCalledTimes(1);
    const another = { ...coin, market_data: { current_price: { usd: 2400.987654321 } } };
    provider.mockResolvedValueOnce(new Response(JSON.stringify(another)));
    expect(
      await getCoinGeckoData({ kind: 'history', coinId: 'ethereum', date: '2026-10-04' })
    ).toEqual(another);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('reuses verified contract metadata without requiring a current price', async () => {
    const body = {
      id: 'asset',
      platforms: { 'polygon-pos': contract },
      image: { small: 'https://example.com/token.png' },
    };
    provider.mockResolvedValueOnce(new Response(JSON.stringify(body)));
    expect(await getCoinGeckoData({ kind: 'contract', address: contract })).toEqual(body);
    vi.setSystemTime(Date.now() + 60001);
    expect(await getCoinGeckoData({ kind: 'contract', address: contract })).toEqual(body);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('returns the dashboard simple-price payload without changing its values', async () => {
    const body = { ethereum: { usd: 2500.123456789 }, 'usd-coin': { usd: 0.99999 } };
    provider.mockResolvedValueOnce(new Response(JSON.stringify(body)));
    expect(await getCoinGeckoData({ kind: 'simple', ids: 'ethereum,usd-coin' })).toEqual(body);
    expect((provider.mock.calls[0][0] as URL).searchParams.get('ids')).toBe('ethereum,usd-coin');
  });

  it.each([
    { kind: 'coin', coinId: 'ethereum', body: { ...coin, id: 'bitcoin' } },
    { kind: 'history', coinId: 'ethereum', date: '2026-10-03', body: { id: 'ethereum' } },
    {
      kind: 'contract',
      address: contract,
      body: { id: 'asset', platforms: { ethereum: contract } },
    },
    { kind: 'simple', ids: 'ethereum,usd-coin', body: { ethereum: { usd: 2500 } } },
  ] as const)(
    'rejects incompatible %s data instead of poisoning the shared cache',
    async ({ body, ...request }) => {
      provider.mockResolvedValueOnce(new Response(JSON.stringify(body)));
      await expect(getCoinGeckoData(request)).rejects.toMatchObject({ status: 502 });
      expect(
        cache.set.mock.calls.filter(
          ([key]) => !key.endsWith(':lock') && !key.endsWith(':admission')
        )
      ).toEqual([]);
    }
  );

  it('replaces a malformed cache entry with validated provider data', async () => {
    await cache.set('coingecko:v1:demo:coin:ethereum', 'invalid json', { EX: 60 });
    expect(await getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).toEqual(coin);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['90', 90],
    ['Tue, 13 Oct 2026 12:01:30 GMT', 88],
  ] as const)(
    'shares Retry-After %s while serving existing cached responses',
    async (header, retryAfter) => {
      await getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' });
      await vi.advanceTimersByTimeAsync(2200);
      provider.mockResolvedValueOnce(
        new Response('', { status: 429, headers: { 'Retry-After': header } })
      );
      await expect(getCoinGeckoData({ kind: 'coin', coinId: 'bitcoin' })).rejects.toMatchObject({
        status: 429,
        retryAfter,
      });
      expect(await getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).toEqual(coin);
      await expect(
        getCoinGeckoData({ kind: 'history', coinId: 'ethereum', date: '2026-10-03' })
      ).rejects.toMatchObject({ status: 429 });
      expect(provider).toHaveBeenCalledTimes(2);
      vi.setSystemTime(Date.now() + 90001);
      provider.mockResolvedValueOnce(new Response(JSON.stringify({ ...coin, id: 'bitcoin' })));
      expect(await getCoinGeckoData({ kind: 'coin', coinId: 'bitcoin' })).toMatchObject({
        id: 'bitcoin',
      });
    }
  );

  it('uses a one-minute cooldown when Retry-After is absent or invalid', async () => {
    provider.mockResolvedValueOnce(new Response('', { status: 429 }));
    await expect(getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).rejects.toMatchObject({
      status: 429,
      retryAfter: 60,
    });
  });

  it.each([404, 500])('does not cache upstream HTTP %s errors', async (status) => {
    provider.mockResolvedValueOnce(new Response('private provider details', { status }));
    await expect(getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).rejects.toMatchObject({
      status: status === 404 ? 404 : 502,
    });
    expect(await cache.get('coingecko:v1:demo:coin:ethereum')).toBeNull();
    expect(await cache.get('coingecko:v1:demo:coin:ethereum:lock')).toBeNull();
  });

  it('returns a sanitized failure for provider transport errors', async () => {
    provider.mockRejectedValueOnce(new Error('sensitive connection information'));
    await expect(getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).rejects.toEqual(
      new MarketDataError(502, 'Market provider is unavailable')
    );
  });

  it('does not bypass an unavailable Redis cache', async () => {
    mocks.getRedis.mockRejectedValueOnce(new Error('private redis URL'));
    await expect(getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).rejects.toMatchObject({
      status: 503,
      message: 'Market cache is unavailable',
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it('bounds waiting for an abandoned cache-miss lease', async () => {
    await cache.set('coingecko:v1:demo:coin:ethereum:lock', 'another instance', { PX: 30000 });
    const pending = expect(
      getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })
    ).rejects.toMatchObject({ status: 503 });
    await vi.advanceTimersByTimeAsync(12001);
    await pending;
    expect(provider).not.toHaveBeenCalled();
    expect(await cache.get('coingecko:v1:demo:coin:ethereum:lock')).toBe('another instance');
  });

  it.each(['demo', 'pro'])(
    'keeps %s credentials on the server-side provider request',
    async (plan) => {
      vi.stubEnv('COINGECKO_API_PLAN', plan);
      vi.stubEnv('COINGECKO_API_KEY', 'server-only-test-key');
      expect(await getCoinGeckoData({ kind: 'coin', coinId: 'ethereum' })).toEqual(coin);
      const [url, options] = provider.mock.calls[0];
      expect(url.origin).toBe(
        plan === 'pro' ? 'https://pro-api.coingecko.com' : 'https://api.coingecko.com'
      );
      expect(options.headers[`x-cg-${plan}-api-key`]).toBe('server-only-test-key');
      expect(url.search).not.toContain('key');
      expect(options.redirect).toBe('error');
    }
  );
});
