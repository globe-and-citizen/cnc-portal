import { describe, expect, it, vi } from 'vitest';
import { ProviderReadGateway } from '../gateway';
import { MarketReadService } from '../market';
import { MemoryStore } from './memoryStore';

describe('Coordinated market data', () => {
  it('canonicalizes a batched price request and shares it across clients', async () => {
    const fetcher = vi.fn(
      async () => new Response('{"usd-coin":{"usd":1},"ethereum":{"usd":2000}}')
    );
    const service = new MarketReadService(new ProviderReadGateway(new MemoryStore(), fetcher));
    expect(
      await service.read(
        'simple/price',
        new URLSearchParams('ids=usd-coin,ethereum,usd-coin&vs_currencies=usd,eur')
      )
    ).toMatchObject({ 'usd-coin': { usd: 1 } });
    await service.read(
      'simple/price',
      new URLSearchParams('ids=ethereum,usd-coin&vs_currencies=eur,usd')
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('persists a historical rate and reuses it in a new service instance', async () => {
    const store = new MemoryStore();
    const fetcher = vi.fn(
      async () => new Response('{"market_data":{"current_price":{"usd":0.5}}}')
    );
    const first = new MarketReadService(new ProviderReadGateway(store, fetcher));
    const params = new URLSearchParams('date=2026-03-13');
    await first.read('coins/polygon-ecosystem-token/history', params);
    const second = new MarketReadService(new ProviderReadGateway(store, fetcher));
    expect(await second.read('coins/polygon-ecosystem-token/history', params)).toMatchObject({
      market_data: { current_price: { usd: 0.5 } },
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('rejects invalid dates and unsupported endpoints before spending provider quota', async () => {
    const fetcher = vi.fn();
    const service = new MarketReadService(new ProviderReadGateway(new MemoryStore(), fetcher));
    await expect(
      service.read('coins/ethereum/history', new URLSearchParams('date=2026-99-99'))
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.read('coins/ethereum/history', new URLSearchParams('date=2100-01-01'))
    ).rejects.toMatchObject({ status: 400 });
    await expect(service.read('coins/ethereum', new URLSearchParams())).rejects.toMatchObject({
      status: 400,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not store an invented historical price when provider data is absent', async () => {
    const store = new MemoryStore();
    const fetcher = vi.fn(async () => new Response('{}'));
    const service = new MarketReadService(new ProviderReadGateway(store, fetcher));
    await expect(
      service.read('coins/ethereum/history', new URLSearchParams('date=2026-03-13'))
    ).rejects.toMatchObject({ reason: 'historical-rate-unavailable' });
    expect(store.records.get('historical-rate:ethereum:2026-03-13')?.payload).toBeNull();
  });
});
