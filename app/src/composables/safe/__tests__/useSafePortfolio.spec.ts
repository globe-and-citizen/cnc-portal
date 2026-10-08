import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { SafeIncomingTransfer } from '@/types/safe'
import { useQueryFn, mockUseContractBalance } from '@/tests/mocks/composables.mock'
import { mockWagmiCore, mockUseChainId } from '@/tests/mocks/wagmi.vue.mock'
import { currentChainId, SUPPORTED_TOKENS, USDT_ADDRESS } from '@/constant'
import { config } from '@/wagmi.config'
import type { SafePortfolioAsset } from '@/utils/safe/portfolio'
import * as assetMarkets from '@/queries/assetMarket.queries'
import { queryClient } from '@/queries/queryClient'
import { contractBalanceKeys } from '@/composables/useContractBalance'
import { knownAssetId } from '@/utils/tokens/assets'
import { safePortfolioRows } from '@/utils/safe/portfolio'
const { useSafePortfolio } =
  await vi.importActual<typeof import('../useSafePortfolio')>('../useSafePortfolio')
const address = '0x1111111111111111111111111111111111111111' as const
const token = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const movement = {
  type: 'ERC20_TRANSFER',
  tokenAddress: token,
  tokenInfo: {
    address: token,
    name: 'Wrapped asset',
    symbol: 'AWETH',
    decimals: 18,
    trusted: false
  }
} as SafeIncomingTransfer
const state = <T>(value: T) => ({
  data: ref(value),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn().mockResolvedValue(undefined)
})
describe('Safe portfolio discovery', () => {
  const originalChains = config.chains
  afterEach(() => Object.assign(config, { chains: originalChains }))
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    mockUseChainId.value = currentChainId
    mockWagmiCore.readContract.mockReset()
    Object.assign(config, { chains: [{ id: currentChainId }] })
  })
  it('discovers each held contract once and retains an unpriced balance', async () => {
    const transfers = state([movement, movement])
    const assets = state<SafePortfolioAsset[]>([])
    useQueryFn.mockReturnValueOnce(transfers).mockReturnValueOnce(assets)
    mockWagmiCore.readContract.mockResolvedValueOnce(10n ** 16n)
    const portfolio = useSafePortfolio(address)
    const query = useQueryFn.mock.calls.at(-1)![0]
    expect(query.queryKey.value.slice(0, 2)).toEqual(
      contractBalanceKeys.detail(address, currentChainId)
    )
    const rows = await query.queryFn()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      quantity: '0.01',
      priceUsd: null,
      valueUsd: null,
      asset: { symbol: 'AWETH', address: token }
    })
    assets.data.value = rows
    expect(portfolio.isIncomplete.value).toBe(true)
    expect(portfolio.totalUsd.value).toBeUndefined()
  })
  it.each([USDT_ADDRESS, USDT_ADDRESS.toLowerCase()])(
    'displays a held USDT0 recognized by address but absent from fixed currencies: %s',
    async (tokenAddress) => {
      expect(knownAssetId(tokenAddress)).toBe('usdt')
      expect(SUPPORTED_TOKENS.some((token) => token.id === 'usdt')).toBe(false)
      const transfer = {
        ...movement,
        tokenAddress,
        tokenInfo: {
          address: tokenAddress,
          name: 'USDT0',
          symbol: 'USDT0',
          decimals: 6,
          trusted: true
        }
      } as SafeIncomingTransfer
      useQueryFn.mockReturnValueOnce(state([transfer])).mockReturnValueOnce(state([]))
      mockWagmiCore.readContract.mockResolvedValueOnce(88_615n)
      const market = vi
        .spyOn(assetMarkets, 'fetchAssetMarket')
        .mockResolvedValueOnce({ coinId: 'usdt0', priceUsd: 1 })
      try {
        useSafePortfolio(address)
        const rows = await useQueryFn.mock.calls.at(-1)![0].queryFn()
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
          raw: 88_615n,
          quantity: '0.088615',
          asset: { symbol: 'USDT0', address: tokenAddress.toLowerCase() }
        })
        expect(safePortfolioRows(rows).find((row) => row.symbol === 'USDT0')).toMatchObject({
          quantity: '0.088615',
          amountLabel: '0.0886'
        })
        expect(mockWagmiCore.readContract).toHaveBeenCalledWith(
          config,
          expect.objectContaining({
            address: tokenAddress.toLowerCase(),
            functionName: 'balanceOf',
            args: [address]
          })
        )
      } finally {
        market.mockRestore()
      }
    }
  )
  it('leaves fixed currencies to their existing balance reads regardless of address casing', async () => {
    const tokenAddress = SUPPORTED_TOKENS[0]!.address.toUpperCase().replace('0X', '0x')
    useQueryFn
      .mockReturnValueOnce(state([{ ...movement, tokenAddress }]))
      .mockReturnValueOnce(state([]))
    useSafePortfolio(address)
    await expect(useQueryFn.mock.calls.at(-1)![0].queryFn()).resolves.toEqual([])
    expect(mockWagmiCore.readContract).not.toHaveBeenCalled()
  })
  it('keeps zero-balance historical assets discoverable without making the total incomplete', async () => {
    useQueryFn
      .mockReturnValueOnce(state([movement]))
      .mockReturnValueOnce(state<SafePortfolioAsset[]>([]))
    mockWagmiCore.readContract.mockResolvedValueOnce(0n)
    useSafePortfolio(address)
    const rows = await useQueryFn.mock.calls.at(-1)![0].queryFn()
    expect(rows[0]).toMatchObject({ raw: 0n, quantity: '0', valueUsd: 0 })
  })
  it('enriches an already discovered token with its later logo metadata', async () => {
    const logoUri = 'https://assets.example/dai.png'
    const withLogo = { ...movement, tokenInfo: { ...movement.tokenInfo!, logoUri } }
    useQueryFn
      .mockReturnValueOnce(state([movement, withLogo]))
      .mockReturnValueOnce(state<SafePortfolioAsset[]>([]))
    mockWagmiCore.readContract.mockResolvedValueOnce(1n)
    useSafePortfolio(address)
    const rows = await useQueryFn.mock.calls.at(-1)![0].queryFn()
    expect(rows).toHaveLength(1)
    expect(rows[0].asset.logoUri).toBe(logoUri)
  })
  it('uses the verified contract market logo when Safe metadata has none', async () => {
    const logoUri = 'https://assets.example/dai.png'
    const market = vi
      .spyOn(assetMarkets, 'fetchAssetMarket')
      .mockResolvedValueOnce({ coinId: 'dai', priceUsd: 1, logoUri })
    try {
      useQueryFn
        .mockReturnValueOnce(
          state([{ ...movement, tokenInfo: { ...movement.tokenInfo!, trusted: true } }])
        )
        .mockReturnValueOnce(state<SafePortfolioAsset[]>([]))
      mockWagmiCore.readContract.mockResolvedValueOnce(1n)
      useSafePortfolio(address)
      const rows = await useQueryFn.mock.calls.at(-1)![0].queryFn()
      expect(rows[0]).toMatchObject({ asset: { logoUri }, priceUsd: 1 })
    } finally {
      market.mockRestore()
    }
  })
  it('reports a transfer-service failure without showing a complete supported-only total', () => {
    const transfers = {
      ...state<SafeIncomingTransfer[]>([]),
      error: ref(new Error('Service unavailable'))
    }
    useQueryFn.mockReturnValueOnce(transfers).mockReturnValueOnce(state<SafePortfolioAsset[]>([]))
    const portfolio = useSafePortfolio(address)
    expect(mockUseContractBalance.data.value).toBeDefined()
    expect(portfolio.isIncomplete.value).toBe(true)
    expect(portfolio.totalUsd.value).toBeUndefined()
  })
  it('keeps the total incomplete when a held supported currency has no usable USD price', () => {
    useQueryFn.mockReturnValueOnce(state([])).mockReturnValueOnce(state<SafePortfolioAsset[]>([]))
    const portfolio = useSafePortfolio(address)
    mockUseContractBalance.balances.value[0]!.price.usd.value = 0
    expect(portfolio.isIncomplete.value).toBe(true)
    expect(portfolio.totalUsd.value).toBeUndefined()
    mockUseContractBalance.balances.value[0]!.raw = 0n
    expect(portfolio.isIncomplete.value).toBe(false)
  })
  it('rejects reads on a wallet network different from the Safe source network', async () => {
    mockUseChainId.value = currentChainId === 137 ? 1 : 137
    useQueryFn.mockReturnValueOnce(state([movement])).mockReturnValueOnce(state([]))
    useSafePortfolio(address)
    await expect(useQueryFn.mock.calls.at(-1)![0].queryFn()).rejects.toThrow(
      'Switch to the Safe network'
    )
    expect(mockWagmiCore.readContract).not.toHaveBeenCalled()
  })
  it('reuses missing token decimals while still refreshing the current balance', async () => {
    const withoutDecimals = { ...movement, tokenInfo: null }
    useQueryFn.mockReturnValueOnce(state([withoutDecimals])).mockReturnValueOnce(state([]))
    mockWagmiCore.readContract
      .mockResolvedValueOnce(1_000_000n)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2_000_000n)
    vi.spyOn(assetMarkets, 'fetchAssetMarket').mockResolvedValue({ coinId: 'asset', priceUsd: 1 })
    try {
      useSafePortfolio(address)
      const query = useQueryFn.mock.calls.at(-1)![0]
      const first = await query.queryFn()
      const next = await query.queryFn()
      expect(first[0].quantity).toBe('1')
      expect(next[0].quantity).toBe('2')
      expect(
        mockWagmiCore.readContract.mock.calls.map(([, params]) => params.functionName)
      ).toEqual(['balanceOf', 'decimals', 'balanceOf'])
    } finally {
      vi.mocked(assetMarkets.fetchAssetMarket).mockRestore()
    }
  })
})
