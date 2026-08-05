import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import type { Address } from 'viem'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore, mockUseChainId } from '@/tests/mocks/wagmi.vue.mock'
import { useCurrencyStore } from '@/stores'
import { SUPPORTED_TOKENS } from '@/constant'
import type { RawTokenBalances } from '@/lib/balances/tokenBalances'

// Globally mocked in composables.setup.ts — this spec exercises the real one.
vi.unmock('@/composables/useContractBalance')

import { useContractBalance, contractBalanceKeys } from '@/composables/useContractBalance'

const ADDRESS = '0x1234567890123456789012345678901234567890' as Address

type CapturedConfig = {
  queryKey: Ref<readonly unknown[]>
  enabled: Ref<boolean>
  refetchInterval: number
  queryFn: () => Promise<RawTokenBalances>
}

const nativeToken = SUPPORTED_TOKENS.find((token) => token.id === 'native')!
const erc20Tokens = SUPPORTED_TOKENS.filter((token) => token.id !== 'native')

describe('useContractBalance', () => {
  let captured: CapturedConfig
  let data: Ref<RawTokenBalances | undefined>

  beforeEach(() => {
    vi.clearAllMocks()
    data = ref<RawTokenBalances | undefined>(undefined)
    useQueryFn.mockImplementation((cfg: unknown) => {
      captured = cfg as CapturedConfig
      return { data, isLoading: ref(false), error: ref(null), refetch: vi.fn() }
    })
  })

  describe('query wiring', () => {
    it('keys the query the way the invalidation call sites target it', () => {
      useContractBalance(ADDRESS)

      expect(captured.queryKey.value).toEqual(['balance', { address: ADDRESS, chainId: 1 }])
      expect(captured.queryKey.value).toEqual(contractBalanceKeys.detail(ADDRESS, 1))
    })

    it('re-keys when the address ref changes', () => {
      const address = ref<Address | undefined>(ADDRESS)
      useContractBalance(address)

      const other = '0x9999999999999999999999999999999999999999' as Address
      address.value = other

      expect(captured.queryKey.value).toEqual(['balance', { address: other, chainId: 1 }])
    })

    it('stays disabled until an address is available', () => {
      const address = ref<Address | undefined>(undefined)
      useContractBalance(address)

      expect(captured.enabled.value).toBe(false)

      address.value = ADDRESS
      expect(captured.enabled.value).toBe(true)
    })

    it('reads every supported token in one pass', async () => {
      mockWagmiCore.getBalance.mockResolvedValue({ value: 10n ** 18n })
      mockWagmiCore.readContract.mockResolvedValue(1_000_000n)

      useContractBalance(ADDRESS)
      const raw = await captured.queryFn()

      expect(mockWagmiCore.getBalance).toHaveBeenCalledTimes(1)
      expect(mockWagmiCore.readContract).toHaveBeenCalledTimes(erc20Tokens.length)
      expect(Object.keys(raw)).toEqual(SUPPORTED_TOKENS.map((token) => token.id))
    })
  })

  describe('data', () => {
    it('is undefined until the first read lands, so loading is not read as a zero balance', () => {
      const { data: derived } = useContractBalance(ADDRESS)

      expect(derived.value).toBeUndefined()
    })

    it('prices the cached amounts once the read lands', () => {
      const { data: derived } = useContractBalance(ADDRESS)

      data.value = { [nativeToken.id]: 10n ** 18n }

      const native = derived.value?.balances.find((balance) => balance.token.id === 'native')
      expect(native?.amount).toBe(1)
      expect(native?.raw).toBe(10n ** 18n)
      // The store mock prices native at 2000 USD.
      expect(native?.value.usd.value).toBe(2000)
      expect(derived.value?.total.usd.value).toBe(2000)
    })

    it('exposes one entry per supported token, in configuration order', () => {
      const { data: derived } = useContractBalance(ADDRESS)

      data.value = {}

      expect(derived.value?.balances.map((balance) => balance.token.id)).toEqual(
        SUPPORTED_TOKENS.map((token) => token.id)
      )
      expect(derived.value?.balances.every((balance) => balance.amount === 0)).toBe(true)
    })

    it('re-prices when the currency changes, without refetching', () => {
      const localPrice = ref(2)
      const localCode = ref('USD')
      vi.mocked(useCurrencyStore).mockReturnValue({
        getTokenInfo: () => ({
          prices: [
            { id: 'local', price: localPrice.value, code: localCode.value, symbol: '$' },
            { id: 'usd', price: 2, code: 'USD', symbol: '$' }
          ]
        })
      } as never)

      const { data: derived } = useContractBalance(ADDRESS)
      data.value = { [nativeToken.id]: 10n ** 18n }

      expect(derived.value?.total.local).toEqual({ value: 2, formatted: '$2' })

      localPrice.value = 5
      localCode.value = 'EUR'

      expect(derived.value?.total.local).toEqual({ value: 5, formatted: '€5' })
      // The USD side and the on-chain amount are untouched by the switch.
      expect(derived.value?.total.usd.value).toBe(2)
      expect(derived.value?.balances.find((b) => b.token.id === 'native')?.amount).toBe(1)
      // Re-pricing is pure derivation: no new read was issued.
      expect(mockWagmiCore.getBalance).not.toHaveBeenCalled()
    })
  })

  it('passes the connected chain through to the reads', async () => {
    mockUseChainId.value = 31337
    mockWagmiCore.getBalance.mockResolvedValue({ value: 0n })
    mockWagmiCore.readContract.mockResolvedValue(0n)

    useContractBalance(ADDRESS)

    expect(captured.queryKey.value).toEqual(['balance', { address: ADDRESS, chainId: 31337 }])

    await captured.queryFn()
    expect(mockWagmiCore.getBalance).toHaveBeenCalledWith(expect.anything(), {
      address: ADDRESS,
      chainId: 31337
    })

    mockUseChainId.value = 1
  })
})
