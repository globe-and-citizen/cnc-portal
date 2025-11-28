import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'

import { mockTeamStore } from '@/tests/mocks/store.mock'

import BankView from '../Accounts/BankView.vue'

vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useTeamStore: vi.fn(() => mockTeamStore)
  }
})

describe('BankView', () => {
  let wrapper: VueWrapper<ComponentPublicInstance & typeof BankView>

  beforeEach(() => {
    wrapper = shallowMount(BankView) as unknown as VueWrapper<
      ComponentPublicInstance & typeof BankView
    >
  })

  describe('Component Rendering', () => {
    it('renders all required sections', () => {
      expect(wrapper.findComponent({ name: 'BankBalanceSection' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'GenericTokenHoldingsSection' }).exists()).toBe(true)
      // expect(wrapper.findComponent({ name: 'TransactionsHistorySection' }).exists()).toBe(true)
    })

    it('passes correct bank address to BankBalanceSection', () => {
      const bankBalanceSection = wrapper.findComponent({ name: 'BankBalanceSection' })
      expect(bankBalanceSection.props('bankAddress')).toBe(
        mockTeamStore.getContractAddressByType('Bank')
      )
    })

    it('passes bankBalanceSection ref to TokenHoldingsSection', () => {
      const tokenHoldingsSection = wrapper.findComponent({ name: 'GenericTokenHoldingsSection' })
      expect(tokenHoldingsSection.props('address')).toBe(
        mockTeamStore.getContractAddressByType('Bank')
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
    it('updates when balance is updated', async () => {
      const bankBalanceSection = wrapper.findComponent({ name: 'BankBalanceSection' })
      await bankBalanceSection.vm.$emit('balance-updated')
      expect(wrapper.emitted()).toBeTruthy()
    })
  })
})
