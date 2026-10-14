import { randomUUID } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { getMarketRedis } from './marketRedisService';

export type CoinGeckoRequest =
  | { kind: 'coin'; coinId: string }
  | { kind: 'contract'; address: string }
  | { kind: 'history'; coinId: string; date: string }
  | { kind: 'simple'; ids: string };

export class MarketDataError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message);
  }
}

const RELEASE_LOCK = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;
// Checking the shared cooldown and claiming an upstream slot must be atomic.
const ADMIT_REQUEST = `
  local cooldown = redis.call('PTTL', KEYS[1])
  if cooldown > 0 then return -cooldown end
  if redis.call('SET', KEYS[2], '1', 'NX', 'PX', ARGV[1]) then return 0 end
  return redis.call('PTTL', KEYS[2])
`;
const EXTEND_COOLDOWN = `
  local ttl = redis.call('PTTL', KEYS[1])
  if ttl < tonumber(ARGV[1]) then
    redis.call('SET', KEYS[1], '1', 'PX', ARGV[1])
  end
  return 1
`;

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validate before sharing a response; keep the original payload and numeric precision. */
function isValidResponse(body: unknown, request: CoinGeckoRequest): boolean {
  if (!record(body)) return false;
  if (request.kind === 'simple') {
    return request.ids.split(',').every((id) => {
      const price = body[id];
      return (
        record(price) &&
        typeof price.usd === 'number' &&
        Number.isFinite(price.usd) &&
        price.usd > 0
      );
    });
  }
  if (typeof body.id !== 'string' || !body.id) return false;
  if (request.kind === 'contract') {
    return (
      record(body.platforms) &&
      typeof body.platforms['polygon-pos'] === 'string' &&
      body.platforms['polygon-pos'].toLowerCase() === request.address
    );
  }
  if (body.id !== request.coinId || !record(body.market_data)) return false;
  const prices = body.market_data.current_price;
  if (!record(prices)) return false;
  return typeof prices.usd === 'number' && Number.isFinite(prices.usd) && prices.usd > 0;
}

function endpoint(request: CoinGeckoRequest, pro: boolean) {
  const base = pro ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
  if (request.kind === 'simple') {
    const url = new URL(`${base}/simple/price`);
    url.searchParams.set('ids', request.ids);
    url.searchParams.set('vs_currencies', 'usd');
    return { url, identity: `simple:${request.ids}:usd`, ttl: 60 };
  }
  if (request.kind === 'contract') {
    return {
      url: new URL(`${base}/coins/polygon-pos/contract/${encodeURIComponent(request.address)}`),
      identity: `contract:polygon-pos:${request.address}`,
      ttl: 24 * 60 * 60,
    };
  }
  const url = new URL(`${base}/coins/${encodeURIComponent(request.coinId)}`);
  if (request.kind === 'history') {
    url.pathname += '/history';
    url.searchParams.set('date', request.date);
    url.searchParams.set('localization', 'false');
    return { url, identity: `history:${request.coinId}:${request.date}`, ttl: 2592000 };
  }
  return { url, identity: `coin:${request.coinId}`, ttl: 60 };
}

function retryAfterMilliseconds(header: string | null): number {
  const seconds = header ? Number(header) : NaN;
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header ?? '') - Date.now();
  return Number.isFinite(delay) ? Math.max(60000, delay) : 60000;
}

/** Redis coordinates cache misses, pacing and cooldown across backend instances. */
export async function getCoinGeckoData(request: CoinGeckoRequest): Promise<unknown> {
  const deadline = Date.now() + 12000;
  const pro = process.env.COINGECKO_API_PLAN === 'pro';
  const { url, identity, ttl } = endpoint(request, pro);
  const prefix = `coingecko:v1:${pro ? 'pro' : 'demo'}`;
  const key = `${prefix}:${identity}`;
  const lockKey = `${key}:lock`;
  const token = randomUUID();
  const configuredInterval = Number(process.env.COINGECKO_REQUEST_INTERVAL_MS ?? 2100);
  const interval =
    Number.isFinite(configuredInterval) && configuredInterval >= 100 ? configuredInterval : 2100;

  try {
    const redis = (await getMarketRedis()).withCommandOptions({ timeout: 2000 });
    while (Date.now() < deadline) {
      const cached = await redis.get(key);
      if (cached !== null) {
        try {
          const body: unknown = JSON.parse(cached);
          if (isValidResponse(body, request)) return body;
        } catch {
          // A malformed cache entry is replaced through the normal locked miss path.
        }
        await redis.del(key);
      }
      const cooldown = await redis.pTTL(`${prefix}:cooldown`);
      if (cooldown > 0)
        throw new MarketDataError(
          429,
          'Market provider is rate limited',
          Math.ceil(cooldown / 1000)
        );
      if (!(await redis.set(lockKey, token, { NX: true, PX: 30000 }))) {
        await wait(100);
        continue;
      }

      try {
        // Another instance may have filled the cache just before this lock was acquired.
        const filled = await redis.get(key);
        if (filled !== null) {
          const body: unknown = JSON.parse(filled);
          if (isValidResponse(body, request)) return body;
        }
        let admitted = false;
        while (Date.now() < deadline) {
          const delay = Number(
            await redis.eval(ADMIT_REQUEST, {
              keys: [`${prefix}:cooldown`, `${prefix}:admission`],
              arguments: [String(interval)],
            })
          );
          if (delay < 0)
            throw new MarketDataError(
              429,
              'Market provider is rate limited',
              Math.ceil(-delay / 1000)
            );
          if (delay === 0) {
            admitted = true;
            break;
          }
          await wait(Math.min(Math.max(delay, 50), 250));
        }
        if (!admitted || Date.now() >= deadline)
          throw new MarketDataError(503, 'Market request queue is busy', 2);

        const apiKey = process.env.COINGECKO_API_KEY?.trim();
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (apiKey) headers[pro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = apiKey;
        let response: globalThis.Response;
        try {
          response = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(Math.min(8000, Math.max(1, deadline - Date.now()))),
            redirect: 'error',
          });
        } catch {
          throw new MarketDataError(502, 'Market provider is unavailable');
        }
        if (response.status === 429) {
          const delay = retryAfterMilliseconds(response.headers.get('Retry-After'));
          await redis.eval(EXTEND_COOLDOWN, {
            keys: [`${prefix}:cooldown`],
            arguments: [String(delay)],
          });
          throw new MarketDataError(
            429,
            'Market provider is rate limited',
            Math.ceil(delay / 1000)
          );
        }
        if (!response.ok) {
          throw new MarketDataError(
            response.status === 404 ? 404 : 502,
            'Market data is unavailable'
          );
        }
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          throw new MarketDataError(502, 'Market provider returned an invalid response');
        }
        if (!isValidResponse(body, request))
          throw new MarketDataError(502, 'Market provider returned an invalid response');
        await redis.set(key, JSON.stringify(body), { EX: ttl });
        return body;
      } finally {
        // Only the owner can release this lock. An unavailable Redis leaves the expiring lease intact.
        await redis
          .eval(RELEASE_LOCK, { keys: [lockKey], arguments: [token] })
          .catch(() => undefined);
      }
    }
    throw new MarketDataError(503, 'Market request queue is busy', 2);
  } catch (error) {
    if (error instanceof MarketDataError) throw error;
    throw new MarketDataError(503, 'Market cache is unavailable', 5);
  }
}
