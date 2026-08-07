import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import publicClient from '../viem.config';
import { getTvlTokens, nativeToken, readBankBalances, fetchPonderTransferVolume } from '../tvl';

vi.mock('../viem.config', () => ({
  default: {
    getBalance: vi.fn(),
    multicall: vi.fn(),
    readContract: vi.fn(),
  },
}));

const BANK = '0xbank0000000000000000000000000000000000a1' as Address;

describe('tvl helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('nativeToken / getTvlTokens', () => {
    it('labels the native coin POL on Polygon and ETH elsewhere', () => {
      expect(nativeToken(137).symbol).toBe('POL');
      expect(nativeToken(80002).symbol).toBe('POL');
      expect(nativeToken(1).symbol).toBe('ETH');
      expect(nativeToken(1).address).toBeNull();
    });

    it('returns native + stablecoins for a known chain, native-only otherwise', () => {
      const polygon = getTvlTokens(137);
      expect(polygon.map((t) => t.key)).toEqual(['native', 'USDC', 'USDCe', 'USDT']);

      const unknown = getTvlTokens(999999);
      expect(unknown.map((t) => t.key)).toEqual(['native']);
    });
  });

  describe('readBankBalances', () => {
    it('returns an empty map when there are no banks', async () => {
      const balances = await readBankBalances([], getTvlTokens(137));
      expect(balances.size).toBe(0);
      expect(publicClient.getBalance).not.toHaveBeenCalled();
    });

    it('reads native + token balances via multicall', async () => {
      vi.mocked(publicClient.getBalance).mockResolvedValue(5n);
      vi.mocked(publicClient.multicall).mockResolvedValue([
        { status: 'success', result: 10n },
        { status: 'success', result: 20n },
        { status: 'success', result: 30n },
      ] as never);

      const balances = await readBankBalances([BANK], getTvlTokens(137));

      expect(balances.get(BANK)).toEqual({ native: 5n, USDC: 10n, USDCe: 20n, USDT: 30n });
      expect(publicClient.readContract).not.toHaveBeenCalled();
    });

    it('falls back to per-call readContract when multicall throws, degrading failures to 0', async () => {
      vi.mocked(publicClient.getBalance).mockResolvedValue(7n);
      vi.mocked(publicClient.multicall).mockRejectedValue(new Error('no multicall3'));
      vi.mocked(publicClient.readContract)
        .mockResolvedValueOnce(11n as never) // USDC
        .mockResolvedValueOnce(22n as never) // USDCe
        .mockRejectedValueOnce(new Error('reverted')); // USDT -> 0n

      const balances = await readBankBalances([BANK], getTvlTokens(137));

      expect(balances.get(BANK)).toEqual({ native: 7n, USDC: 11n, USDCe: 22n, USDT: 0n });
      expect(publicClient.readContract).toHaveBeenCalledTimes(3);
    });

    it('degrades a failed native read to 0', async () => {
      vi.mocked(publicClient.getBalance).mockRejectedValue(new Error('rpc down'));
      vi.mocked(publicClient.multicall).mockResolvedValue([] as never);

      // Native-only token set => no token reads, just the native getBalance path.
      const balances = await readBankBalances([BANK], [nativeToken(1)]);

      expect(balances.get(BANK)).toEqual({ native: 0n });
    });
  });

  describe('fetchPonderTransferVolume', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      delete process.env.PONDER_URL;
    });

    it('returns null when PONDER_URL is unset', async () => {
      delete process.env.PONDER_URL;
      global.fetch = vi.fn() as never;
      expect(await fetchPonderTransferVolume()).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null on a non-ok response', async () => {
      process.env.PONDER_URL = 'http://ponder.test';
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502 }) as never;
      expect(await fetchPonderTransferVolume()).toBeNull();
    });

    it('returns null when the request throws', async () => {
      process.env.PONDER_URL = 'http://ponder.test';
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;
      expect(await fetchPonderTransferVolume()).toBeNull();
    });

    it('returns the parsed volume on success (and trims a trailing slash from the URL)', async () => {
      process.env.PONDER_URL = 'http://ponder.test/';
      const payload = { totals: { native: '1', tokens: {} }, byContract: [] };
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
      global.fetch = fetchMock as never;

      expect(await fetchPonderTransferVolume()).toEqual(payload);
      expect(fetchMock).toHaveBeenCalledWith('http://ponder.test/stats/bank-transfer-volume');
    });
  });
});
