import { describe, expect, it, beforeEach, vi } from 'vitest'
import { erc20Abi, type Address } from 'viem'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import { config as wagmiConfig } from '@/wagmi.config'
import type { TokenConfig } from '@/constant'
import {
  fetchTokenBalances,
  toContractBalances,
  toTokenBalances,
  sumTokenBalances,
  type GetTokenInfo
} from '../tokenBalances'

const HOLDER = '0x1111111111111111111111111111111111111111' as Address
const USDC = '0x2222222222222222222222222222222222222222' as Address

const nativeToken: TokenConfig = {
  id: 'native',
  name: 'Ether',
  symbol: 'ETH',
  code: 'ETH',
  coingeckoId: 'ethereum',
  decimals: 18,
  address: '0x0000000000000000000000000000000000000000'
}

const usdcToken: TokenConfig = {
  id: 'usdc',
  name: 'USD Coin',
  symbol: 'USDC',
  code: 'USDC',
  coingeckoId: 'usd-coin',
  decimals: 6,
  address: USDC
}

const TOKENS = [usdcToken, nativeToken]

/** Local currency is EUR, so the two rows are genuinely distinct. */
const getTokenInfo: GetTokenInfo = (tokenId) => ({
  prices: [
    { id: 'local', price: tokenId === 'native' ? 1800 : 0.9, code: 'EUR', symbol: '€' },
    { id: 'usd', price: tokenId === 'native' ? 2000 : 1, code: 'USD', symbol: '$' }
  ]
})

const USD_CODES = { usd: 'USD', local: 'USD' }

describe('fetchTokenBalances', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWagmiCore.getBalance.mockResolvedValue({ value: 10n ** 18n })
    mockWagmiCore.readContract.mockResolvedValue(12_500_000n)
  })

  it('reads native through getBalance and ERC-20s through balanceOf, keyed by token id', async () => {
    const balances = await fetchTokenBalances(wagmiConfig, {
      address: HOLDER,
      chainId: 31337,
      tokens: TOKENS
    })

    expect(balances).toEqual({ usdc: 12_500_000n, native: 10n ** 18n })

    expect(mockWagmiCore.getBalance).toHaveBeenCalledWith(wagmiConfig, {
      address: HOLDER,
      chainId: 31337
    })
    expect(mockWagmiCore.readContract).toHaveBeenCalledWith(wagmiConfig, {
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [HOLDER],
      chainId: 31337
    })
  })

  it('rejects when a single read fails rather than reporting a silent zero', async () => {
    mockWagmiCore.readContract.mockRejectedValue(new Error('RPC down'))

    await expect(
      fetchTokenBalances(wagmiConfig, { address: HOLDER, chainId: 31337, tokens: TOKENS })
    ).rejects.toThrow('RPC down')
  })
})

describe('toTokenBalances', () => {
  const codes = { usd: 'USD', local: 'EUR' }

  it('keeps the exact on-chain amount alongside the lossy decimal one', () => {
    const balances = toTokenBalances(TOKENS, { usdc: 12_500_000n }, getTokenInfo, codes)

    expect(balances[0]?.raw).toBe(12_500_000n)
    expect(balances[0]?.amount).toBe(12.5)
  })

  it('prices the holding in both currencies from the matching store rows', () => {
    const balances = toTokenBalances(
      TOKENS,
      { usdc: 12_500_000n, native: 10n ** 18n },
      getTokenInfo,
      codes
    )

    expect(balances[0]?.value.usd.value).toBe(12.5)
    expect(balances[0]?.value.local.value).toBe(11.25)
    expect(balances[0]?.price).toEqual({
      usd: { value: 1, formatted: '$1' },
      local: { value: 0.9, formatted: '€0.9' }
    })
    expect(balances[1]?.value.usd.value).toBe(2000)
  })

  it('returns one entry per token in order, defaulting a missing balance to zero', () => {
    const balances = toTokenBalances(TOKENS, { native: 10n ** 18n }, getTokenInfo, codes)

    expect(balances).toHaveLength(2)
    expect(balances[0]).toMatchObject({ raw: 0n, amount: 0, token: usdcToken })
    expect(balances[0]?.value.usd.value).toBe(0)
  })

  it('treats an unpriced token as zero-valued without dropping it', () => {
    const balances = toTokenBalances(TOKENS, { usdc: 12_500_000n }, () => null, codes)

    expect(balances).toHaveLength(2)
    expect(balances[0]?.amount).toBe(12.5)
    expect(balances[0]?.value.usd.value).toBe(0)
    expect(balances[0]?.price.usd.value).toBe(0)
  })
})

describe('sumTokenBalances', () => {
  it('sums the held value of every token, in both currencies', () => {
    const codes = { usd: 'USD', local: 'EUR' }
    const balances = toTokenBalances(
      TOKENS,
      { usdc: 12_500_000n, native: 10n ** 18n },
      getTokenInfo,
      codes
    )

    expect(sumTokenBalances(balances, codes)).toEqual({
      usd: { value: 2012.5, formatted: '$2.01K' },
      local: { value: 1811.25, formatted: '€1.81K' }
    })
  })

  it('returns a zeroed pair when there is nothing to sum', () => {
    expect(sumTokenBalances([], USD_CODES)).toEqual({
      usd: { value: 0, formatted: '$0' },
      local: { value: 0, formatted: '$0' }
    })
  })
})

describe('toContractBalances', () => {
  it('formats the local side with the store currency, not USD', () => {
    const { total } = toContractBalances(TOKENS, { native: 10n ** 18n }, getTokenInfo)

    expect(total.usd.formatted).toBe('$2K')
    expect(total.local.formatted).toBe('€1.8K')
  })

  it('keeps both sides distinct when the local currency IS usd', () => {
    const usdOnly: GetTokenInfo = () => ({
      prices: [
        { id: 'local', price: 2, code: 'USD', symbol: '$' },
        { id: 'usd', price: 2, code: 'USD', symbol: '$' }
      ]
    })

    const { total } = toContractBalances(TOKENS, { native: 10n ** 18n }, usdOnly)

    // A code-keyed map collapsed these two rows into one entry.
    expect(total.usd.value).toBe(2)
    expect(total.local.value).toBe(2)
  })

  it('falls back to USD formatting before prices have loaded', () => {
    const { balances, total } = toContractBalances(TOKENS, {}, () => null)

    expect(balances).toHaveLength(2)
    expect(total).toEqual({
      usd: { value: 0, formatted: '$0' },
      local: { value: 0, formatted: '$0' }
    })
  })
})
