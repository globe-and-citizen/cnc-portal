import type { Address } from 'viem';
import publicClient from './viem.config';

/**
 * TVL (Total Value Locked) helpers.
 *
 * The backend owns the hard part of TVL: mapping each team to its on-chain Bank
 * (treasury) contracts and reading their current token balances. It returns RAW
 * on-chain amounts (as strings, since JSON has no bigint) keyed by token; the
 * dashboard values them in USD using its existing token-price store. Keeping
 * pricing in one place (the dashboard) avoids duplicating a CoinGecko client
 * here.
 */

// Minimal ERC-20 ABI — only `balanceOf` is needed to read treasury holdings.
export const ERC20_BALANCE_OF_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// A token the TVL feature values. The native coin uses `address: null`.
export interface TvlToken {
  key: string; // stable identifier used as the response map key
  symbol: string; // display symbol (also used by the dashboard to resolve price)
  decimals: number;
  address: Address | null; // null => native coin
}

// Stablecoins held by team treasuries, per chain. Mirrors the dashboard's
// TOKEN_ADDRESSES so both sides value the same set. Addresses are lowercased so
// they match ponder's lowercased token addresses without per-call normalization.
const STABLECOINS_BY_CHAIN: Record<number, Array<Omit<TvlToken, 'key'> & { key: string }>> = {
  // Polygon mainnet
  137: [
    {
      key: 'USDC',
      symbol: 'USDC',
      decimals: 6,
      address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    },
    {
      key: 'USDCe',
      symbol: 'USDCe',
      decimals: 6,
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    },
    {
      key: 'USDT',
      symbol: 'USDT',
      decimals: 6,
      address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    },
  ],
  // Polygon Amoy testnet
  80002: [
    {
      key: 'USDC',
      symbol: 'USDC',
      decimals: 6,
      address: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    },
    {
      key: 'USDCe',
      symbol: 'USDCe',
      decimals: 6,
      address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    },
    {
      key: 'USDT',
      symbol: 'USDT',
      decimals: 6,
      address: '0x83ef79413e0dc985035ba0c49b0abd0da62987ed',
    },
  ],
};

const POLYGON_CHAIN_IDS = new Set([137, 80002]);

/** Native coin descriptor for a chain (Polygon = POL, otherwise ETH). */
export const nativeToken = (chainId: number): TvlToken => ({
  key: 'native',
  symbol: POLYGON_CHAIN_IDS.has(chainId) ? 'POL' : 'ETH',
  decimals: 18,
  address: null,
});

/** Full valued token set for a chain: native coin first, then known stablecoins. */
export const getTvlTokens = (chainId: number): TvlToken[] => [
  nativeToken(chainId),
  ...(STABLECOINS_BY_CHAIN[chainId] ?? []),
];

/** Per-Bank balances keyed by token.key (raw bigint amounts). */
export type BankBalances = Map<string, Record<string, bigint>>;

/**
 * Reads native + ERC-20 balances for every Bank address. Token balances go
 * through multicall (one round-trip on chains with Multicall3); a per-call
 * fallback covers chains without it. Individual read failures degrade to 0
 * rather than failing the whole snapshot.
 */
export const readBankBalances = async (
  banks: Address[],
  tokens: TvlToken[]
): Promise<BankBalances> => {
  const balances: BankBalances = new Map();
  banks.forEach((bank) => balances.set(bank, {}));
  if (banks.length === 0) return balances;

  const erc20Tokens = tokens.filter(
    (t): t is TvlToken & { address: Address } => t.address !== null
  );

  // Native balances.
  await Promise.all(
    banks.map(async (bank) => {
      try {
        balances.get(bank)!.native = await publicClient.getBalance({ address: bank });
      } catch {
        balances.get(bank)!.native = 0n;
      }
    })
  );

  if (erc20Tokens.length === 0) return balances;

  // Token balances: one balanceOf per (bank, token), flattened for multicall.
  const contracts = banks.flatMap((bank) =>
    erc20Tokens.map((token) => ({
      address: token.address,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf' as const,
      args: [bank] as const,
    }))
  );

  let results: Array<{ status: 'success' | 'failure'; result?: unknown }>;
  try {
    results = await publicClient.multicall({ contracts, allowFailure: true });
  } catch {
    // Chain without Multicall3 (or multicall unavailable): read one by one.
    results = await Promise.all(
      contracts.map(async (contract) => {
        try {
          return { status: 'success' as const, result: await publicClient.readContract(contract) };
        } catch {
          return { status: 'failure' as const };
        }
      })
    );
  }

  let i = 0;
  for (const bank of banks) {
    for (const token of erc20Tokens) {
      const entry = results[i++];
      balances.get(bank)![token.key] =
        entry && entry.status === 'success' ? (entry.result as bigint) : 0n;
    }
  }

  return balances;
};

// ─── Ponder transfer-volume integration ────────────────────────────────────────

export interface PonderBankVolume {
  contractAddress: string;
  native: string;
  tokens: Record<string, string>;
}

export interface PonderTransferVolume {
  totals: { native: string; tokens: Record<string, string> };
  byContract: PonderBankVolume[];
}

/**
 * Fetches platform-wide Bank transfer volume from ponder. Returns null when
 * PONDER_URL is unset or the request fails, so TVL still renders without the
 * "total transferred" figure (graceful degradation) instead of erroring.
 */
export const fetchPonderTransferVolume = async (): Promise<PonderTransferVolume | null> => {
  const ponderUrl = process.env.PONDER_URL;
  if (!ponderUrl) return null;

  try {
    const res = await fetch(`${ponderUrl.replace(/\/$/, '')}/stats/bank-transfer-volume`);
    if (!res.ok) {
      console.error(`Ponder transfer-volume request failed: ${res.status}`);
      return null;
    }
    return (await res.json()) as PonderTransferVolume;
  } catch (error) {
    console.error('Error fetching ponder transfer volume:', error);
    return null;
  }
};
