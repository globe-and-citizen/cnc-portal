import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DepositHistory from '@/components/sections/SingleTeamView/tables/DepositHistory.vue'
import { createTestingPinia } from '@pinia/testing'
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import SkeletonLoading from '@/components/SkeletonLoading.vue'

let depositEvents = [
  {
    transactionHash: '0x1',
    args: {
      depositor: '0xDepositor1',
      amount: '1000000000000000000' // 1 ETH
    },
    blockHash: '0xBlockHash'
  },
  {
    transactionHash: '0x2',
    args: {
      depositor: '0xDepositor2',
      amount: '1000000000000000000' // 1 ETH
    },
    blockHash: '0xBlockHash'
  }
]

vi.mock('@/stores/useToastStore')
vi.mock('viem/actions', async (importOriginal) => {
  const original: Object = await importOriginal()
  return {
    ...original,
    getLogs: vi.fn(() => depositEvents),
    getBlock: vi.fn(() => ({ timestamp: 1620000000 }))
  }
})

window.open = vi.fn()

describe('DepositHistory', () => {
  const createComponent = () => {
    return mount(DepositHistory, {
      props: {
        bankAddress: '0x123'
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  describe('Actions', () => {
    it('opens transaction detail in a new window when a row is clicked', async () => {
      const wrapper = createComponent()

      await flushPromises()
      const row = wrapper.find('tr[data-test="table-data-row"]')
      await row.trigger('click')
      expect(window.open).toHaveBeenCalledWith(
        `${NETWORK.blockExplorerUrl}/tx/${depositEvents[0].transactionHash}`,
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
      const { addErrorToast } = useToastStore()
      expect(addErrorToast).toHaveBeenCalled()
    })
  })

  describe('Render', () => {
    it('renders correctly', async () => {
      // basic render
      const wrapper = createComponent()

      await flushPromises()
      expect(wrapper.find('div[data-test="table"]').exists()).toBeTruthy()
      expect(wrapper.find('tr[data-test="table-head-row"]').exists()).toBeTruthy()
      expect(wrapper.find('tr[data-test="table-data-row"]').exists()).toBe(true)

      // table header
      const header = ['No', 'Depositor', 'Amount', 'Date']
      expect(wrapper.findAll('th').length).toBe(4)
      expect(wrapper.findAll('th').forEach((th, index) => expect(th.text()).toBe(header[index])))

      // table body
      expect(wrapper.findAll('td').length).toBe(depositEvents.length * header.length)
    })

    it('renders tbody with data if events exists', async () => {
      const wrapper = createComponent()

      await flushPromises()
      const tbody = wrapper.find('tbody[data-test="data-exists"]')
      expect(tbody.isVisible()).toBeTruthy()
    })

    it('renders table body correctly', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const numberElements = wrapper.findAll('td[data-test="data-row-number"]')
      const depositorElements = wrapper.findAll('td[data-test="data-row-depositor"]')
      const amountElements = wrapper.findAll('td[data-test="data-row-amount"]')
      const dateElements = wrapper.findAll('td[data-test="data-row-date"]')

      expect(numberElements.length).toBe(depositEvents.length)
      expect(depositorElements.length).toBe(depositEvents.length)
      expect(amountElements.length).toBe(depositEvents.length)
      expect(dateElements.length).toBe(depositEvents.length)

      depositEvents.forEach((event, index) => {
        expect(numberElements[index].text()).toBe((index + 1).toString())
        expect(depositorElements[index].text()).toBe(event.args.depositor)
        expect(amountElements[index].text()).toBe(`1 ${NETWORK.currencySymbol}`)
        expect(dateElements[index].text()).toBe('5/3/2021, 12:00:00 AM')
      })
    })

    it('renders loading state when fetching data', async () => {
      const wrapper = createComponent()
      await wrapper.setValue({ loading: true })

      expect(wrapper.findComponent(SkeletonLoading).exists()).toBeTruthy()
    })

    it('renders empty state when there is no data', async () => {
      depositEvents = []
      const wrapper = createComponent()

      await flushPromises()

      console.log(wrapper.html())
      expect(wrapper.find('[data-test="data-exists"]').exists()).toBeFalsy()
      expect(wrapper.find('[data-test="data-empty"]').exists()).toBeTruthy()
    })
  })
})
