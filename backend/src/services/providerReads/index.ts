import { prisma } from '../../utils/dependenciesUtil';
import { ProviderReadGateway } from './gateway';
import { PrismaProviderReadStore } from './prismaStore';
import { SafeReadService } from './safe';
import { MarketReadService } from './market';

const interval = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 250 && value <= 60_000 ? value : fallback;
};
export const providerGateway = new ProviderReadGateway(
  new PrismaProviderReadStore(prisma),
  fetch,
  Date.now,
  undefined,
  {
    safe: interval('SAFE_READ_INTERVAL_MS', 1000),
    coingecko: interval('COINGECKO_READ_INTERVAL_MS', 2000),
  }
);
export const safeReads = new SafeReadService(providerGateway);
export const marketReads = new MarketReadService(providerGateway);
