import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { VueWrapper, mount } from '@vue/test-utils'
import SendToWalletHistory from '@/components/bank-history/SendToWalletHistory.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import type { EventResult } from '@/types'
import type { Result } from 'ethers'
import { ref } from 'vue'
import { useBankEvents } from '@/composables/bank'
import { createTestingPinia } from '@pinia/testing'
import { NETWORK } from '@/constant'

const sendToWalletEvents: EventResult[] = [
  {
    txHash: '0x1',
    data: ['0xOwner', ['0xMember1', '0xMember2'], '1000000000000000000'] as Result, // 1 ETH
    date: '2024-06-25'
  },
  {
    txHash: '0x2',
    data: ['0xOwner', ['0xMember1', '0xMember2'], '2000000000000000000'] as Result, // 2 ETH
    date: '2024-06-26'
  }
]
vi.mock('@/adapters/web3LibraryAdapter', () => {
  return {
    EthersJsAdapter: {
      getInstance: () => ({
        formatEther: vi.fn((value) => (value / 1e18).toString()) // Mock implementation
      })
    }
  }
})

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn().mockImplementation(() => ({ addErrorToast: vi.fn() }))
}))

vi.mock('@/composables/bank', () => ({
  useBankEvents: vi.fn().mockImplementation(() => ({
    getEvents: vi.fn().mockReturnValue(sendToWalletEvents),
    loading: ref(false),
    events: ref(sendToWalletEvents),
    error: ref(null)
  }))
}))

describe('SendToWalletHistory', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mount(SendToWalletHistory, {
      props: {
        bankAddress: '0x123'
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  })

  describe('Render', () => {
    it('renders correctly', () => {
      // basic render
      expect(wrapper.find('div.overflow-x-auto.bg-base-100.mt-5').exists()).toBe(true)
      expect(wrapper.find('table.table-zebra.text-center').exists()).toBe(true)
      expect(wrapper.find('thead tr').exists()).toBe(true)
      expect(wrapper.find('tbody tr').exists()).toBe(true)

      // table header
      const header = ['No', 'Owner Address', 'Member Addresses', 'Total Amount', 'Date']
      expect(wrapper.findAll('th').length).toBe(5)
      expect(wrapper.findAll('th').forEach((th, index) => expect(th.text()).toBe(header[index])))

      // table body
      expect(wrapper.findAll('td').length).toBe(sendToWalletEvents.length * header.length)
    })

    it('renders table body correctly', () => {
      const tableData = wrapper.findAll('td')
      const no = tableData[0].text()
      const ownerAddress = tableData[1].text()
      const memberAddresses = tableData[2].text()
      const totalAmount = tableData[3].text()
      const date = tableData[4].text()

      expect(no).toEqual('1')
      expect(ownerAddress).toEqual(sendToWalletEvents[0].data[0])
      expect(memberAddresses).toEqual(sendToWalletEvents[0].data[1].join(''))
      expect(totalAmount).toEqual('1 SepoliaETH')
      expect(date).toEqual(sendToWalletEvents[0].date)
    })

    it('renders skeleton loading if loading', () => {
      ;(useBankEvents as Mock).mockImplementationOnce(() => ({
        getEvents: vi.fn().mockReturnValue([]),
        loading: ref(true),
        events: ref([]),
        error: ref(null)
      }))

      const wrapper = mount(SendToWalletHistory, {
        props: {
          bankAddress: '0x123'
        }
      })
      expect(wrapper.findComponent(SkeletonLoading).exists()).toBe(true)
    })

    it('renders empty table when no deposit events', () => {
      ;(useBankEvents as Mock).mockImplementationOnce(() => ({
        getEvents: vi.fn().mockReturnValue([]),
        loading: ref(false),
        events: ref([]),
        error: ref(null)
      }))

      const wrapper = mount(SendToWalletHistory, {
        props: {
          bankAddress: '0x123'
        }
      })
      const emtpyRow = wrapper.find('tr td.text-center.font-bold.text-lg')
      expect(emtpyRow.exists()).toBe(true)
      expect(emtpyRow.text()).toBe('No send to wallet history')
      expect(emtpyRow.attributes('colspan')).toBe('5')
    })
  })

  describe('Actions', () => {
    it('calls getEvents when mounted', async () => {
      const getEvents = vi.fn()
      ;(useBankEvents as Mock).mockImplementationOnce(() => ({
        getEvents,
        loading: ref(false),
        events: ref([]),
        error: ref(null)
      }))

      mount(SendToWalletHistory, {
        props: {
          bankAddress: '0x123'
        }
      })
      expect(getEvents).toHaveBeenCalled()
    })

    it('opens transaction detail in a new window when a row is clicked', async () => {
      global.open = vi.fn() // Mock window.open

      const row = wrapper.findAll('tbody tr')[0]
      await row.trigger('click')
      expect(global.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
    })
  })
})
