import { ProviderReadGateway } from './gateway';
import { ProviderReadError } from './store';

const PLATFORMS: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon-pos',
  42161: 'arbitrum-one',
  10: 'optimistic-ethereum',
  8453: 'base',
};
const validCoin = (coin: string) => /^[a-z0-9][a-z0-9-]{0,99}$/.test(coin);

export class MarketReadService {
  constructor(private readonly gateway: ProviderReadGateway) {}

  async read(path: string, params: URLSearchParams) {
    const pro = process.env.COINGECKO_API_TIER === 'pro';
    const url = new URL(`https://${pro ? 'pro-api' : 'api'}.coingecko.com/api/v3/${path}`);
    const headers = process.env.COINGECKO_API_KEY
      ? { [pro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key']: process.env.COINGECKO_API_KEY }
      : undefined;
    const history = path.match(/^coins\/([a-z0-9-]+)\/history$/);
    const contract = path.match(
      /^coins\/(ethereum|polygon-pos|arbitrum-one|optimistic-ethereum|base)\/contract\/(0x[0-9a-fA-F]{40})$/
    );
    if (history && validCoin(history[1])) {
      const date = params.get('date');
      if (
        !date ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date ||
        date > new Date().toISOString().slice(0, 10) ||
        params.size !== 1
      ) {
        throw new ProviderReadError(400, 0, 'invalid-historical-date');
      }
      // CoinGecko accepts ISO dates; completed UTC dates are immutable accounting snapshots.
      url.searchParams.set('date', date);
      url.searchParams.set('localization', 'false');
      return this.gateway.cached(
        `historical-rate:${history[1]}:${date}`,
        3_153_600_000_000,
        async () => {
          const body = await this.gateway.json<{
            market_data?: { current_price?: { usd?: unknown } };
          }>({ provider: 'coingecko', url, headers }, 0, 60_000);
          const price = body.market_data?.current_price?.usd;
          if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
            throw new ProviderReadError(502, 60, 'historical-rate-unavailable');
          }
          const rounded = Math.round(price * 1e6) / 1e6;
          if (rounded <= 0 || !Number.isSafeInteger(Math.round(rounded * 1e6))) {
            throw new ProviderReadError(502, 60, 'historical-rate-precision-unavailable');
          }
          return body;
        }
      );
    }
    if (contract && params.size === 0 && Object.values(PLATFORMS).includes(contract[1])) {
      url.pathname = url.pathname.toLowerCase();
      return this.gateway.json({ provider: 'coingecko', url, headers }, 60_000, 21_600_000);
    }
    if (
      path === 'simple/price' &&
      [...params.keys()].every((key) => ['ids', 'vs_currencies'].includes(key))
    ) {
      const ids = [...new Set((params.get('ids') ?? '').split(','))].sort();
      const currencies = [...new Set((params.get('vs_currencies') ?? 'usd').split(','))].sort();
      if (
        !ids.length ||
        ids.length > 50 ||
        !ids.every(validCoin) ||
        currencies.length > 10 ||
        !currencies.every((item) => /^[a-z]{3,5}$/.test(item))
      ) {
        throw new ProviderReadError(400, 0, 'invalid-market-query');
      }
      url.searchParams.set('ids', ids.join(','));
      url.searchParams.set('vs_currencies', currencies.join(','));
      url.searchParams.set('include_last_updated_at', 'true');
      return this.gateway.json({ provider: 'coingecko', url, headers }, 60_000);
    }
    throw new ProviderReadError(400, 0, 'unsupported-market-resource');
  }
}
