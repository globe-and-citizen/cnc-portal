import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ExpenseStatsSection from '@/components/sections/ExpenseAccountView/ExpenseStatsSection.vue'
import * as utils from '@/utils'
import { ref } from 'vue'
import { parseEther } from 'viem'
// import AddressToolTip from '@/components/AddressToolTip.vue'

const { mockUseTeamStore } = vi.hoisted(() => ({
  mockUseTeamStore: {
    currentTeam: { expenseAccountEip712Address: '0xExpenseAccount' }
  }
}))

type NetworkCurrencyBalance = {
  decimals: number
  formatted: string
  symbol: string
  value: bigint
}

const mockUseBalance = {
  data: ref<null | NetworkCurrencyBalance>({
    decimals: 18,
    formatted: `100`,
    symbol: `SepoliaETH`,
    value: parseEther(`100`)
  }),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}

const mockUseReadContract = {
  data: ref<null | bigint>(BigInt(20000 * 1e6)),
  refetch: vi.fn(),
  error: ref<Error | null>(null),
  isLoading: ref(false)
}

describe.skip('ExpenseStatsSection', () => {
  const createComponent = () => mount(ExpenseStatsSection)

  describe('Render', () => {
    it('should display correct values', async () => {
      const wrapper = createComponent()
      await flushPromises()
      const expenseBalance = wrapper.find('[data-test="expense-account-balance"]')
      expect(expenseBalance.exists()).toBeTruthy()
      expect(expenseBalance.html()).toContain('100')
      const addressToolTip = wrapper.findComponent({ name: 'AddressToolTip' })
      expect(addressToolTip.exists()).toBeTruthy()
      expect(addressToolTip.props('address')).toBe(
        mockUseTeamStore.currentTeam.expenseAccountEip712Address
      )
    })
    it('should display zero values if no balances', async () => {
      mockUseBalance.data.value = null
      mockUseReadContract.data.value = null
      const wrapper = createComponent()
      //@ts-expect-error: not visible from wrapper
      wrapper.vm.isLoadingNetworkCurrencyBalance = false
      await flushPromises()
      const expenseBalance = wrapper.find('[data-test="expense-account-balance"]')
      expect(expenseBalance.exists()).toBeTruthy()
      expect(expenseBalance.html()).toContain('0')
    })
    it('should notify fetch network currency error', async () => {
      const wrapper = createComponent()
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      //@ts-expect-error: not visible from wrapper
      wrapper.vm.networkCurrencyBalanceError = new Error('Error fetching network currency balance')
      await flushPromises()
      expect(logErrorSpy).toBeCalledWith(
        'networkCurrencyBalanceError.value: ',
        'Error fetching network currency balance'
      )
    })
  })
})
