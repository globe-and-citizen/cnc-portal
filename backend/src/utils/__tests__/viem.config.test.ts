import { hardhat, mainnet, polygon, polygonAmoy, sepolia } from 'viem/chains';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreatePublicClient, mockFallback, mockHttp } = vi.hoisted(() => ({
  mockCreatePublicClient: vi.fn((config: unknown) => config),
  mockFallback: vi.fn((transports: unknown[]) => ({ transports })),
  mockHttp: vi.fn((url?: string) => ({ url })),
}));

vi.mock('viem', () => ({
  createPublicClient: mockCreatePublicClient,
  fallback: mockFallback,
  http: mockHttp,
}));

const loadConfiguredClient = async (chainId?: string) => {
  if (chainId === undefined) delete process.env.CHAIN_ID;
  else process.env.CHAIN_ID = chainId;
  return (await import('../viem.config')).default;
};

describe('viem.config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.CHAIN_ID;
    delete process.env.RPC_URL;
  });

  it.each([
    ['the default chain', undefined, sepolia],
    ['an unknown chain', '999999', sepolia],
    ['mainnet', mainnet.id.toString(), mainnet],
    ['sepolia', sepolia.id.toString(), sepolia],
    ['polygon', polygon.id.toString(), polygon],
    ['hardhat', hardhat.id.toString(), hardhat],
    ['polygon Amoy', polygonAmoy.id.toString(), polygonAmoy],
    ['a hexadecimal mainnet ID', '0x1', mainnet],
    ['a hexadecimal polygon ID', '0x89', polygon],
  ])('configures %s', async (_label, chainId, expectedChain) => {
    await loadConfiguredClient(chainId);

    expect(mockCreatePublicClient).toHaveBeenCalledWith(
      expect.objectContaining({ chain: expectedChain })
    );
  });

  it('uses a single transport for a chain without public peers', async () => {
    await loadConfiguredClient(hardhat.id.toString());

    expect(mockHttp).toHaveBeenCalledWith();
    expect(mockFallback).not.toHaveBeenCalled();
  });

  it.each([
    [polygon, ['https://polygon.drpc.org', 'https://polygon-bor-rpc.publicnode.com']],
    [mainnet, ['https://eth.drpc.org', 'https://ethereum-rpc.publicnode.com']],
  ])('configures public fallback transports for $name', async (chain, expectedUrls) => {
    await loadConfiguredClient(chain.id.toString());

    for (const url of expectedUrls) expect(mockHttp).toHaveBeenCalledWith(url);
    expect(mockFallback).toHaveBeenCalledTimes(1);
  });
});
