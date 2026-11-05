import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { tokenHoldingRows } from '@/utils/tokens/holdings'
import { nextTick } from 'vue'
import { makeTokenBalance, mockUseContractBalance } from '@/tests/mocks/composables.mock'
import { shallowMount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import { mockTeamStore } from '@/tests/mocks/store.mock'

import BankView from '../Accounts/BankView.vue'

describe('[US-BANK-003] BankView', () => {
  let wrapper: VueWrapper<ComponentPublicInstance & typeof BankView>

  beforeEach(() => {
    wrapper = shallowMount(BankView) as unknown as VueWrapper<
      ComponentPublicInstance & typeof BankView
    >
  })

  afterEach(() => wrapper.unmount())

  describe('Component Rendering', () => {
    it('renders all required sections', () => {
      expect(wrapper.findComponent({ name: 'BankBalanceSection' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'TokenHoldingsSection' }).exists()).toBe(true)
      // expect(wrapper.findComponent({ name: 'TransactionsHistorySection' }).exists()).toBe(true)
    })

    it('passes correct bank address to BankBalanceSection', () => {
      const bankBalanceSection = wrapper.findComponent({ name: 'BankBalanceSection' })
      expect(bankBalanceSection.props('bankAddress')).toBe(
        mockTeamStore.getContractAddressByType('Bank')
      )
    })

    it('passes priced balance rows to TokenHoldingsSection', () => {
      const tokenHoldingsSection = wrapper.findComponent({ name: 'TokenHoldingsSection' })
      expect(tokenHoldingsSection.props('rows')).toEqual(
        tokenHoldingRows(mockUseContractBalance.data.value)
      )
    })

    it('renders BankBalanceSection', () => {
      const bankBalanceSection = wrapper.findComponent({ name: 'BankBalanceSection' })
      expect(bankBalanceSection.exists()).toBe(true)
    })
  })

  describe('Computed Properties', () => {
    it('computes bankAddress correctly from teamStore', () => {
      expect(wrapper.vm.bankAddress).toBe(mockTeamStore.getContractAddressByType('Bank'))
    })
  })

  describe('Data Management', () => {
    it('updates the holdings rows when the balance query changes', async () => {
      const holdings = wrapper.findComponent({ name: 'TokenHoldingsSection' })
      mockUseContractBalance.balances.value = [
        makeTokenBalance({ amount: 2, usdPrice: 3, localPrice: 5 })
      ]
      await nextTick()
      expect(holdings.props('rows')).toMatchObject([
        { token: { symbol: 'ETH' }, quantity: '2', amount: 2, price: 5, balance: 10 }
      ])

      mockUseContractBalance.balances.value = [
        makeTokenBalance({ amount: 7, usdPrice: 3, localPrice: 5 })
      ]
      await nextTick()
      expect(holdings.props('rows')).toMatchObject([
        { token: { symbol: 'ETH' }, quantity: '7', amount: 7, price: 5, balance: 35 }
      ])

      mockUseContractBalance.balances.value = []
      await nextTick()
      expect(holdings.props('rows')).toEqual([])
    })

    it('passes loading state changes to the holdings section', async () => {
      const holdings = wrapper.findComponent({ name: 'TokenHoldingsSection' })
      mockUseContractBalance.isLoading.value = true
      await nextTick()
      expect(holdings.props('isLoading')).toBe(true)
      mockUseContractBalance.isLoading.value = false
      await nextTick()
      expect(holdings.props('isLoading')).toBe(false)
    })
  })
})
