import { randomUUID } from 'node:crypto';
import { ProviderReadError, ProviderReadStore } from './store';

export interface ProviderRequest {
  provider: 'safe' | 'coingecko';
  url: URL;
  headers?: Record<string, string>;
}

interface CachedResponse {
  status: number;
  body: unknown;
}

export function retryAfterSeconds(value: string | null, now: number, fallback = 60) {
  if (!value) return fallback;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1, Math.ceil(seconds));
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1, Math.ceil((date - now) / 1000)) : fallback;
}

/** No hidden transport retries: all instances obey one persistent provider budget. */
export class ProviderReadGateway {
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(
    readonly store: ProviderReadStore,
    private readonly request: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
    private readonly sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms)),
    private readonly gaps: Record<'safe' | 'coingecko', number> = { safe: 1000, coingecko: 2000 }
  ) {}

  /** Cache complete domain snapshots as well as atomic HTTP responses. */
  async cached<T>(key: string, ttlMs: number, load: (previous: unknown) => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;
    const operation = this.resolve(key, ttlMs, load);
    this.pending.set(key, operation);
    try {
      return await operation;
    } finally {
      this.pending.delete(key);
    }
  }

  private async resolve<T>(
    key: string,
    ttlMs: number,
    load: (previous: unknown) => Promise<T>
  ): Promise<T> {
    const started = this.now();
    const token = randomUUID();
    while (this.now() - started < 15_000) {
      const record = await this.store.find(key);
      if (record?.payload != null && record.expiresAt && record.expiresAt.getTime() > this.now()) {
        return record.payload as T;
      }
      if (
        await this.store.claim(key, token, new Date(this.now()), new Date(this.now() + 300_000))
      ) {
        try {
          const value = await load(record?.payload);
          await this.store.save(key, token, value, new Date(this.now() + ttlMs));
          return value;
        } finally {
          await this.store.release(key, token);
        }
      }
      await this.sleep(250);
    }
    throw new ProviderReadError(503, 2, 'read-pending');
  }

  async json<T>(input: ProviderRequest, ttlMs: number, negativeTtlMs = 60_000): Promise<T> {
    const key = `http:${input.provider}:${input.url.href}`;
    const load = async (): Promise<CachedResponse> => {
      const response = await this.fetchPaced(input);
      if (response.status === 404) {
        // A provider 404 is retryable after a bounded negative-cache period.
        const payload = { status: 404, body: null };
        // The outer success TTL is overridden below through a separate negative record.
        await this.cached(`missing:${key}`, negativeTtlMs, async () => payload);
        throw new ProviderReadError(404, Math.ceil(negativeTtlMs / 1000), 'provider-not-found');
      }
      if (response.status < 200 || response.status >= 300) throw new ProviderReadError(502, 2);
      return response;
    };
    // Complete history/date snapshots own their domain lease. Do not retain a new
    // raw page body for every sliding-window URL in addition to that snapshot.
    const result = ttlMs > 0 ? await this.cached<CachedResponse>(key, ttlMs, load) : await load();
    return result.body as T;
  }

  private async fetchPaced(input: ProviderRequest) {
    const missing = await this.store.find(`missing:http:${input.provider}:${input.url.href}`);
    if (missing?.expiresAt && missing.expiresAt.getTime() > this.now()) {
      throw new ProviderReadError(
        404,
        Math.ceil((missing.expiresAt.getTime() - this.now()) / 1000),
        'provider-not-found'
      );
    }
    const token = randomUUID();
    const started = this.now();
    while (true) {
      const delay = await this.store.permit(
        input.provider,
        token,
        new Date(this.now()),
        this.gaps[input.provider]
      );
      if (!delay) break;
      if (this.now() - started + delay >= 15_000)
        throw new ProviderReadError(503, Math.max(2, Math.ceil(delay / 1000)), 'provider-busy');
      await this.sleep(delay);
    }
    try {
      const response = await this.request(input.url, {
        headers: { Accept: 'application/json', ...input.headers },
        signal: AbortSignal.timeout(15_000),
        redirect: 'error',
      });
      if (response.status === 429) {
        const retryAfter = retryAfterSeconds(response.headers.get('Retry-After'), this.now());
        const reset = Number(response.headers.get('X-RateLimit-Reset'));
        const body = await response.text();
        const monthlyQuota = /monthly quota exceeded/i.test(body);
        const pause = monthlyQuota
          ? Math.max(retryAfter, Number.isFinite(reset) && reset > 0 ? reset : 3600)
          : retryAfter;
        await this.store.block(input.provider, new Date(this.now() + pause * 1000));
        throw new ProviderReadError(
          429,
          pause,
          monthlyQuota ? 'provider-quota-exhausted' : 'provider-cooldown'
        );
      }
      // Hold the provider lease until the response body has been consumed.
      const body = response.ok ? await response.json() : (await response.text(), null);
      return { status: response.status, body };
    } catch (error) {
      if (error instanceof ProviderReadError) throw error;
      throw new ProviderReadError(502, 2);
    } finally {
      await this.store.finish(input.provider, token);
    }
  }
}
