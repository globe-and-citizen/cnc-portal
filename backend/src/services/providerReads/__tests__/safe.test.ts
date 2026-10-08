import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderReadGateway } from '../gateway';
import { SafeReadService } from '../safe';
import { MemoryStore } from './memoryStore';

const address = '0x1111111111111111111111111111111111111111';
const path = `api/v1/safes/${address}/incoming-transfers/`;
const row = (id: string, date = '2026-10-08T10:00:00Z') => ({
  transferId: id,
  executionDate: date,
});
const page = (rows: unknown[], next: string | null = null, count = rows.length) =>
  new Response(JSON.stringify({ results: rows, next, count }));

describe('Persistent Safe history', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('publishes all pages once, then replaces the overlap without deleting older evidence', async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async (input: URL) => {
        const next = new URL(input);
        next.searchParams.set('offset', '500');
        return page([row('old', '2026-10-01T12:00:00Z')], next.href, 2);
      })
      .mockImplementationOnce(async () => page([row('recent')], null, 2))
      .mockImplementationOnce(async () => page([row('new')]));
    const store = new MemoryStore();
    const service = new SafeReadService(new ProviderReadGateway(store, fetcher));
    const initial = service.read(137, path, new URLSearchParams('limit=50'));
    await vi.runAllTimersAsync();
    expect(await initial).toMatchObject({
      next: null,
      count: 2,
      results: [row('recent'), row('old', '2026-10-01T12:00:00Z')],
    });
    await vi.advanceTimersByTimeAsync(120_001);
    const next = await service.read(137, path, new URLSearchParams('limit=500'));
    expect(next).toMatchObject({
      count: 2,
      results: [row('new'), row('old', '2026-10-01T12:00:00Z')],
    });
    expect(String(fetcher.mock.calls[2][0])).toContain('execution_date__gte=');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('preserves the previous complete snapshot and watermark when a later page fails', async () => {
    const fetcher = vi.fn().mockImplementationOnce(async () => page([row('complete')]));
    const store = new MemoryStore();
    const service = new SafeReadService(new ProviderReadGateway(store, fetcher));
    await service.read(137, path, new URLSearchParams());
    const before = structuredClone(store.records.get(`safe-history:137:${path}:`)?.payload);
    await vi.advanceTimersByTimeAsync(120_001);
    fetcher
      .mockImplementationOnce(async (input: URL) => {
        const next = new URL(input);
        next.searchParams.set('offset', '500');
        return page([row('partial')], next.href, 2);
      })
      .mockImplementationOnce(async () => new Response('{}', { status: 500 }));
    const retry = service.read(137, path, new URLSearchParams()).catch((error) => error);
    await vi.runAllTimersAsync();
    expect(await retry).toMatchObject({ status: 502 });
    expect(store.records.get(`safe-history:137:${path}:`)?.payload).toEqual(before);
  });

  it('rejects malicious pagination without forwarding an authorization header to another host', async () => {
    const fetcher = vi.fn(async () => page([row('one')], 'https://example.org/steal'));
    const service = new SafeReadService(new ProviderReadGateway(new MemoryStore(), fetcher));
    await expect(service.read(137, path, new URLSearchParams())).rejects.toMatchObject({
      reason: 'invalid-pagination-target',
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('rejects paths and query overrides instead of exposing an arbitrary proxy', async () => {
    const fetcher = vi.fn();
    const service = new SafeReadService(new ProviderReadGateway(new MemoryStore(), fetcher));
    await expect(
      service.read(137, 'https://example.org', new URLSearchParams())
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.read(137, path, new URLSearchParams('url=https://example.org'))
    ).rejects.toMatchObject({ status: 400 });
    await expect(service.read(999, path, new URLSearchParams())).rejects.toMatchObject({
      status: 400,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('invalidates the server snapshot after a confirmed client operation', async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(async () => page([row('one')]))
      .mockImplementationOnce(async () => page([row('two')]));
    const service = new SafeReadService(new ProviderReadGateway(new MemoryStore(), fetcher));
    await service.read(137, path, new URLSearchParams());
    await service.invalidate(137, address);
    const fresh = service.read(137, path, new URLSearchParams());
    await vi.runAllTimersAsync();
    expect(await fresh).toMatchObject({ results: [row('two')] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
