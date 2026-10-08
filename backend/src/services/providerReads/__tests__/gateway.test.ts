import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderReadGateway, retryAfterSeconds } from '../gateway';
import { MemoryStore } from './memoryStore';

const target = (path = 'one') => ({
  provider: 'safe' as const,
  url: new URL(`https://api.safe.global/${path}`),
});
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

describe('Shared provider read coordination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('coalesces twenty clients across two gateway instances and reuses the persisted response after restart', async () => {
    const store = new MemoryStore();
    const fetcher = vi.fn(async () => json({ value: 42 }));
    const first = new ProviderReadGateway(store, fetcher);
    const second = new ProviderReadGateway(store, fetcher);
    const reads = Promise.all(
      Array.from({ length: 20 }, (_, index) => (index % 2 ? first : second).json(target(), 60_000))
    );
    await vi.runAllTimersAsync();
    expect(await reads).toEqual(Array.from({ length: 20 }, () => ({ value: 42 })));
    expect(await new ProviderReadGateway(store, fetcher).json(target(), 60_000)).toEqual({
      value: 42,
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('paces distinct cold reads across instances and refetches after expiry', async () => {
    const starts: number[] = [];
    const fetcher = vi.fn(async () => {
      starts.push(Date.now());
      return json({ ok: true });
    });
    const store = new MemoryStore();
    const one = new ProviderReadGateway(store, fetcher);
    const two = new ProviderReadGateway(store, fetcher);
    const reads = Promise.all([
      one.json(target('a'), 100),
      two.json(target('b'), 100),
      one.json(target('c'), 100),
    ]);
    await vi.runAllTimersAsync();
    await reads;
    expect(starts.map((time) => time - starts[0])).toEqual([0, 1000, 2000]);
    const again = one.json(target('a'), 100);
    await vi.runAllTimersAsync();
    await again;
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it('stops all instances for Retry-After after one 429 instead of retrying other resources', async () => {
    const store = new MemoryStore();
    const fetcher = vi.fn(
      async () => new Response('{}', { status: 429, headers: { 'Retry-After': '120' } })
    );
    await expect(
      new ProviderReadGateway(store, fetcher).json(target(), 60_000)
    ).rejects.toMatchObject({ status: 429, retryAfter: 120 });
    await expect(
      new ProviderReadGateway(store, fetcher).json(target('other'), 60_000)
    ).rejects.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('uses the monthly quota reset instead of continuously retrying an exhausted plan', async () => {
    const store = new MemoryStore();
    const fetcher = vi.fn(
      async () =>
        new Response('{"detail":"Monthly quota exceeded."}', {
          status: 429,
          headers: { 'X-RateLimit-Reset': '86400' },
        })
    );
    await expect(
      new ProviderReadGateway(store, fetcher).json(target(), 60_000)
    ).rejects.toMatchObject({ retryAfter: 86400, reason: 'provider-quota-exhausted' });
  });

  it('negative-caches a missing resource but allows discovery after its bounded expiry', async () => {
    const store = new MemoryStore();
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async () => new Response('{}', { status: 404 }))
      .mockImplementation(async () => json({ recovered: true }));
    const gateway = new ProviderReadGateway(store, fetcher);
    await expect(gateway.json(target(), 60_000, 10_000)).rejects.toMatchObject({ status: 404 });
    await expect(gateway.json(target(), 60_000, 10_000)).rejects.toMatchObject({ status: 404 });
    expect(fetcher).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await gateway.json(target(), 60_000, 10_000)).toEqual({ recovered: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps unsuccessful reads out of the positive cache and supports HTTP-date retry headers', async () => {
    const store = new MemoryStore();
    const gateway = new ProviderReadGateway(
      store,
      vi.fn(async () => new Response('{}', { status: 500 }))
    );
    await expect(gateway.json(target(), 60_000)).rejects.toMatchObject({ status: 502 });
    expect((await store.find(`http:safe:${target().url.href}`))?.payload).toBeNull();
    expect(retryAfterSeconds(new Date(Date.now() + 5000).toUTCString(), Date.now())).toBe(5);
  });

  it('does not confuse an invalid provider key with an expired CNC user session', async () => {
    const gateway = new ProviderReadGateway(
      new MemoryStore(),
      vi.fn(async () => new Response('{}', { status: 401 }))
    );
    await expect(gateway.json(target(), 60_000)).rejects.toMatchObject({ status: 502 });
  });
});
