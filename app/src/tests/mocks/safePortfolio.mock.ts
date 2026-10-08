import { computed, ref } from 'vue'
import { vi } from 'vitest'
import type { SafePortfolioAsset } from '@/utils/safe/portfolio'
import { mockUseContractBalance } from './composables.mock'

export const mockUseSafePortfolio = {
  supported: mockUseContractBalance,
  assets: {
    data: ref<SafePortfolioAsset[]>([]),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn().mockResolvedValue(undefined)
  },
  totalUsd: computed(() => mockUseContractBalance.data.value?.total.usd.value),
  isIncomplete: ref(false),
  isLoading: computed(() => mockUseContractBalance.isLoading.value),
  refetch: vi.fn().mockResolvedValue(undefined)
}

export function resetSafePortfolioMock() {
  mockUseSafePortfolio.isIncomplete.value = false
  mockUseSafePortfolio.assets.data.value = []
  mockUseSafePortfolio.refetch.mockClear()
}
