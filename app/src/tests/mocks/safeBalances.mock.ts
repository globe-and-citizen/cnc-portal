import { computed, ref, toValue } from 'vue'
import { vi } from 'vitest'
import type { GetSafeBalancesParams } from '@/queries/safeClient.queries'
import type { SafeClientBalance, SafeClientBalances } from '@/types/safe'
import type { AssetMetadata } from '@/utils/tokens/assets'
import { mockUseContractBalance } from './composables.mock'

interface FixtureAsset {
  asset: AssetMetadata
  raw: bigint | null
  quantity: string | null
  priceUsd: number | null
  valueUsd: number | null
}

/** Keep existing balance fixtures usable while exercising the Gateway response contract. */
export const mockUseSafeBalances = {
  assets: { data: ref<FixtureAsset[]>([]) },
  isIncomplete: ref(false),
  isLoading: computed(() => mockUseContractBalance.isLoading.value),
  refetch: vi.fn().mockResolvedValue(undefined),
  query(params?: GetSafeBalancesParams) {
    const data = computed<SafeClientBalances | undefined>(() => {
      const source = mockUseContractBalance.data.value
      if (!source) return undefined
      const local =
        toValue(params?.pathParams.fiatCode) !== undefined &&
        toValue(params?.pathParams.fiatCode) !== 'USD'
      const items: SafeClientBalance[] = source.balances.map((entry) => ({
        tokenInfo: {
          type: entry.token.id === 'native' ? 'NATIVE_TOKEN' : 'ERC20',
          address: entry.token.address,
          name: entry.token.name,
          symbol: entry.token.symbol,
          decimals: entry.token.decimals
        },
        balance: entry.raw.toString(),
        fiatConversion: String(local ? entry.price.local.value : entry.price.usd.value),
        fiatBalance: String(local ? entry.value.local.value : entry.value.usd.value)
      }))
      items.push(
        ...mockUseSafeBalances.assets.data.value.map(
          (row): SafeClientBalance => ({
            tokenInfo: {
              type: 'ERC20',
              address: row.asset.address!,
              name: row.asset.name,
              symbol: row.asset.symbol,
              decimals: row.asset.decimals ?? 18,
              logoUri: row.asset.logoUri
            },
            balance: row.raw?.toString() ?? null,
            fiatConversion: row.priceUsd?.toString() ?? null,
            fiatBalance: row.valueUsd?.toString() ?? null
          })
        )
      )
      if (mockUseSafeBalances.isIncomplete.value && items[0]) items[0].balance = null
      return { fiatTotal: String(local ? source.total.local.value : source.total.usd.value), items }
    })
    return {
      data,
      isLoading: mockUseSafeBalances.isLoading,
      error: mockUseContractBalance.error,
      refetch: mockUseSafeBalances.refetch
    }
  }
}

export function resetSafeBalancesMock() {
  mockUseSafeBalances.isIncomplete.value = false
  mockUseSafeBalances.assets.data.value = []
  mockUseSafeBalances.refetch.mockClear()
}
