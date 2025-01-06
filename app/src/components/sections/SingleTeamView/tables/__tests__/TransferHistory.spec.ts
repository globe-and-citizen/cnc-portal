import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TransferHistory from '@/components/sections/SingleTeamView/tables/TransferHistory.vue'
import { createTestingPinia } from '@pinia/testing'
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import SkeletonLoading from '@/components/SkeletonLoading.vue'

let transferEvents = [
  {
    transactionHash: '0x1',
    args: {
      sender: '0xSender1',
      to: '0xTo1',
      amount: '1000000000000000000' // 1 ETH
    },
    blockHash: '0xBlockHash'
  },
  {
    transactionHash: '0x2',
    args: {
      sender: '0xSender2',
      to: '0xTo2',
      amount: '1000000000000000000' // 1 ETH
    },
    blockHash: '0xBlockHash'
  }
]

vi.mock('@/stores/useToastStore')
vi.mock('viem/actions', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    getLogs: vi.fn(() => transferEvents),
    getBlock: vi.fn(() => ({ timestamp: 1620000000 }))
  }
})

describe('TransferHistory', () => {
  const createComponent = () => {
    return mount(TransferHistory, {
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
      global.open = vi.fn() // Mock window.open

      const wrapper = createComponent()

      await flushPromises()
      const row = wrapper.findAll('tbody tr')[0]
      await row.trigger('click')
      expect(global.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
    })

    it('calls addErrorToast when there is an error fetching data', async () => {
      mount(TransferHistory, {
        props: {
          bankAddress: '0x123'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })],
          mocks: {
            error: new Error('Failed to get transfer events')
          }
        }
      })
      const { addErrorToast } = useToastStore()
      expect(addErrorToast).toHaveBeenCalledWith('Failed to get transfer events')
    })
  })

  describe('Render', () => {
    it('renders correctly', async () => {
      // basic render
      const wrapper = createComponent()

      await flushPromises()
      expect(wrapper.find('div[data-test="table"]').exists()).toBeTruthy()
      expect(wrapper.find('tr[data-test="table-head-row"]').exists()).toBeTruthy()
      expect(wrapper.find('tr[data-test="table-body-row"]').exists()).toBeTruthy()

      // table header
      const header = ['No', 'Sender', 'To', 'Amount', 'Date']
      expect(wrapper.findAll('th').length).toBe(5)
      expect(wrapper.findAll('th').forEach((th, index) => expect(th.text()).toBe(header[index])))

      // table body
      expect(wrapper.findAll('td').length).toBe(transferEvents.length * header.length)
    })

    it('renders table body correctly', async () => {
      const wrapper = createComponent()

      await flushPromises()
      const numberElements = wrapper.findAll('td[data-test="data-row-number"]')
      const senderElements = wrapper.findAll('td[data-test="data-row-sender"]')
      const toElements = wrapper.findAll('td[data-test="data-row-to"]')
      const amountElements = wrapper.findAll('td[data-test="data-row-amount"]')
      const dateElements = wrapper.findAll('td[data-test="data-row-date"]')

      expect(numberElements.length).toBe(transferEvents.length)
      expect(senderElements.length).toBe(transferEvents.length)
      expect(toElements.length).toBe(transferEvents.length)
      expect(amountElements.length).toBe(transferEvents.length)
      expect(dateElements.length).toBe(transferEvents.length)

      transferEvents.forEach((event, index) => {
        expect(numberElements[index].text()).toBe((index + 1).toString())
        expect(senderElements[index].text()).toBe(event.args.sender)
        expect(toElements[index].text()).toBe(event.args.to)
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
      transferEvents = []
      const wrapper = createComponent()

      await flushPromises()
      expect(wrapper.find('tbody[data-test="data-empty"]').exists()).toBeTruthy()
    })
  })
})
