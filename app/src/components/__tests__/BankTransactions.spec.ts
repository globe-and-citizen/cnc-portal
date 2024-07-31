import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import BankTransactions from '@/components/BankTransactions.vue'
import AccordionComponent from '@/components/AccordionComponent.vue'
import DepositHistory from '@/components/bank-history/DepositHistory.vue'
import TransferHistory from '@/components/bank-history/TransferHistory.vue'
import TipsAddressChangedHistory from '@/components/bank-history/TipsAddressChangedHistory.vue'
import SendToWalletHistory from '@/components/bank-history/SendToWalletHistory.vue'
import { createTestingPinia } from '@pinia/testing'

vi.mock('@/adapters/web3LibraryAdapter', () => {
  return {
    EthersJsAdapter: {
      getInstance: () => ({
        formatEther: vi.fn((value) => (value / 1e18).toString()) // Mock implementation
      })
    }
  }
})

describe('BankTransactions', () => {
  describe('Render', () => {
    it('renders correctly', () => {
      const wrapper = mount(BankTransactions, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        },
        props: {
          bankAddress: '0x4b6Bf5cD91446408290725879F5666dcd9785F62'
        }
      })
      expect(wrapper.find('div#bank-transactions').exists()).toBe(true)

      expect(wrapper.findComponent(AccordionComponent).exists()).toBe(true)
      expect(wrapper.findComponent(DepositHistory).exists()).toBe(true)
      expect(wrapper.findComponent(TransferHistory).exists()).toBe(true)
      expect(wrapper.findComponent(TipsAddressChangedHistory).exists()).toBe(true)
      expect(wrapper.findComponent(SendToWalletHistory).exists()).toBe(true)
    })
  })
})
