import { describe, expect, it, beforeEach, vi } from 'vitest'
import { erc20Abi, type Address } from 'viem'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import { config as wagmiConfig } from '@/wagmi.config'
import type { TokenConfig } from '@/constant'
import type { TokenBalance } from '@/types'
import {
  fetchTokenBalances,
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

/** Two currencies so the per-code fan-out is actually exercised. */
const getTokenInfo: GetTokenInfo = (tokenId) => ({
  prices: [
    { id: 'usd', price: tokenId === 'native' ? 2000 : 1, code: 'USD', symbol: '$' },
    { id: 'local', price: tokenId === 'native' ? 1800 : 0.9, code: 'EUR', symbol: '€' }
  ]
})

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
  it('applies each token decimals and prices every currency the store exposes', () => {
    const balances = toTokenBalances(
      TOKENS,
      { usdc: 12_500_000n, native: 10n ** 18n },
      getTokenInfo
    )

    expect(balances.map((b) => b.amount)).toEqual([12.5, 1])
    expect(balances[0]?.values.USD).toMatchObject({ value: 12.5, price: 1, code: 'USD' })
    expect(balances[0]?.values.EUR).toMatchObject({ value: 11.25, price: 0.9, code: 'EUR' })
    expect(balances[1]?.values.USD).toMatchObject({ value: 2000, price: 2000 })
  })

  it('returns one entry per token in order, defaulting a missing balance to zero', () => {
    const balances = toTokenBalances(TOKENS, { native: 10n ** 18n }, getTokenInfo)

    expect(balances).toHaveLength(2)
    expect(balances[0]).toMatchObject({ amount: 0, token: usdcToken })
    expect(balances[0]?.values.USD?.value).toBe(0)
  })

  it('treats an unpriced token as zero-valued without dropping it', () => {
    const balances = toTokenBalances(TOKENS, { usdc: 12_500_000n }, (tokenId) =>
      tokenId === 'usdc' ? { prices: [{ id: 'usd', price: null, code: 'USD', symbol: '$' }] } : null
    )

    expect(balances[0]?.values.USD).toMatchObject({ value: 0, price: 0 })
    expect(balances[1]?.values).toEqual({})
  })
})

describe('sumTokenBalances', () => {
  it('sums every token per currency code', () => {
    const balances = toTokenBalances(
      TOKENS,
      { usdc: 12_500_000n, native: 10n ** 18n },
      getTokenInfo
    )

    const total = sumTokenBalances(balances)

    expect(total.USD?.value).toBe(2012.5)
    expect(total.EUR?.value).toBe(1811.25)
    expect(total.USD?.symbol).toBe('$')
  })

  it('returns an empty record when there is nothing to sum', () => {
    expect(sumTokenBalances([])).toEqual({})
  })

  it('ignores a currency a later token does not carry', () => {
    const balances: TokenBalance[] = [
      {
        amount: 1,
        token: usdcToken,
        values: {
          USD: {
            value: 1,
            formated: '$1',
            id: 'usd',
            code: 'USD',
            symbol: '$',
            price: 1,
            formatedPrice: '$1'
          }
        }
      },
      { amount: 2, token: nativeToken, values: {} }
    ]

    expect(sumTokenBalances(balances).USD?.value).toBe(1)
  })
})
