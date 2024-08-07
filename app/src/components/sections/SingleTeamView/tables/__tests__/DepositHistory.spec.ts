import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { VueWrapper, mount } from '@vue/test-utils'
import DepositHistory from '@/components/sections/SingleTeamView/tables/DepositHistory.vue'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import type { EventResult } from '@/types'
import type { Result } from 'ethers'
import { ref } from 'vue'
import { useBankEvents } from '@/composables/bank'
import { createTestingPinia } from '@pinia/testing'
import { NETWORK } from '@/constant'

const depositEvents: EventResult[] = [
  {
    txHash: '0x1',
    data: ['0xDepositor1', '1000000000000000000'] as Result, // 1 ETH
    date: '2024-06-25'
  },
  {
    txHash: '0x2',
    data: ['0xDepositor2', '2000000000000000000'] as Result, // 2 ETH
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

const addErrorToastMock = vi.fn()
vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn().mockImplementation(() => ({ addErrorToast: addErrorToastMock }))
}))

vi.mock('@/composables/bank', () => ({
  useBankEvents: vi.fn().mockImplementation(() => ({
    getEvents: vi.fn().mockReturnValue(depositEvents),
    loading: ref(false),
    events: ref(depositEvents),
    error: ref(null)
  }))
}))

window.open = vi.fn()

describe('DepositHistory', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mount(DepositHistory, {
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
      const header = ['No', 'Depositor', 'Amount', 'Date']
      expect(wrapper.findAll('th').length).toBe(4)
      expect(wrapper.findAll('th').forEach((th, index) => expect(th.text()).toBe(header[index])))

      // table body
      expect(wrapper.findAll('td').length).toBe(depositEvents.length * header.length)
    })

    it('renders tbody with data if events exists', () => {
      const tbody = wrapper.find('tbody[data-test="data-exists"]')
      expect(tbody.isVisible()).toBeTruthy()
    })

    it('renders data with correct length', () => {
      const tbody = wrapper.findAll('tbody tr')
      expect(tbody.length).toBe(depositEvents.length)
    })

    it('renders table body correctly', () => {
      const tableData = wrapper.findAll('td')
      const no = tableData[0].text()
      const depositor = tableData[1].text()
      const amount = tableData[2].text()
      const date = tableData[3].text()

      expect(no).toEqual('1')
      expect(depositor).toEqual(depositEvents[0].data[0])
      expect(amount).toEqual(`1 ${NETWORK.currencySymbol}`)
      expect(date).toEqual(depositEvents[0].date)
    })

    it('renders empty tbody if events does not exists', () => {
      ;(useBankEvents as Mock).mockImplementationOnce(() => ({
        getEvents: vi.fn().mockReturnValue([]),
        loading: ref(false),
        events: ref([]),
        error: ref(null)
      }))

      const wrapper = mount(DepositHistory, {
        props: {
          bankAddress: '0x123'
        }
      })
      const tbody = wrapper.find('tbody[data-test="data-not-exists"]')
      expect(tbody.isVisible()).toBeTruthy()
    })

    it('renders empty row correctly when no deposit events', () => {
      ;(useBankEvents as Mock).mockImplementationOnce(() => ({
        getEvents: vi.fn().mockReturnValue([]),
        loading: ref(false),
        events: ref([]),
        error: ref(null)
      }))

      const wrapper = mount(DepositHistory, {
        props: {
          bankAddress: '0x123'
        }
      })
      const emtpyRow = wrapper.find('td[data-test="empty-row"]')
      expect(emtpyRow.exists()).toBe(true)
      expect(emtpyRow.text()).toBe('No Deposit transactions')
      expect(emtpyRow.attributes('colspan')).toBe('4')
    })

    it('renders skeleton loading if loading', () => {
      ;(useBankEvents as Mock).mockImplementationOnce(() => ({
        getEvents: vi.fn().mockReturnValue([]),
        loading: ref(true),
        events: ref([]),
        error: ref(null)
      }))

      const wrapper = mount(DepositHistory, {
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

      const wrapper = mount(DepositHistory, {
        props: {
          bankAddress: '0x123'
        }
      })
      const emtpyRow = wrapper.find('tr td.text-center.font-bold.text-lg')
      expect(emtpyRow.exists()).toBe(true)
      expect(emtpyRow.text()).toBe('No Deposit transactions')
      expect(emtpyRow.attributes('colspan')).toBe('4')
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

      mount(DepositHistory, {
        props: {
          bankAddress: '0x123'
        }
      })
      expect(getEvents).toHaveBeenCalled()
    })

    it('opens transaction detail in a new window when a row is clicked', async () => {
      const row = wrapper.find('tbody tr')
      await row.trigger('click')
      expect(window.open).toHaveBeenCalledWith(
        `${NETWORK.blockExplorerUrl}/tx/${depositEvents[0].txHash}`,
        '_blank'
      )
    })

    it('calls addErrorToast when error exists', async () => {
      mount(DepositHistory, {
        props: {
          bankAddress: '0x123'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })],
          mocks: {
            error: new Error('Error')
          }
        }
      })
      expect(addErrorToastMock).toHaveBeenCalled()
    })
  })
})
