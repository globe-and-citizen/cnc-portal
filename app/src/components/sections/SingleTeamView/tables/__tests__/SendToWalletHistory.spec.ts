import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import SendToWalletHistory from '@/components/sections/SingleTeamView/tables/SendToWalletHistory.vue'
import { createTestingPinia } from '@pinia/testing'
import { NETWORK } from '@/constant'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

let sendToWalletEvents = [
  {
    transactionHash: '0x1',
    args: {
      addressWhoPushes: '0xOwner',
      addresses: ['0xMember1', '0xMember2'],
      totalAmount: '1000000000000000000' // 1 ETH
    },
    blockHash: '0xBlockHash'
  },
  {
    transactionHash: '0x2',
    args: {
      addressWhoPushes: '0xOwner',
      addresses: ['0xMember1', '0xMember2'],
      totalAmount: '1000000000000000000' // 1 ETH
    },
    blockHash: '0xBlockHash'
  }
]

vi.mock('@/stores/useToastStore')
vi.mock('viem/actions', async (importOriginal) => {
  const original: Object = await importOriginal()
  return {
    ...original,
    getLogs: vi.fn(() => sendToWalletEvents),
    getBlock: vi.fn(() => ({ timestamp: 1620000000 }))
  }
})

describe('SendToWalletHistory', () => {
  const createComponent = () => {
    return mount(SendToWalletHistory, {
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

      await flushPromises() // wait for all ticks to complete
      const row = wrapper.find('tr[data-test="table-body-row"]')
      await row.trigger('click')
      expect(global.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
    })

    it('calls addErrorToast when there is an error fetching data', async () => {
      mount(SendToWalletHistory, {
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
      const wrapper = createComponent()

      await flushPromises() // wait for all ticks to complete
      expect(wrapper.find("div[data-test='table']").exists()).toBeTruthy()
      expect(wrapper.find("tr[data-test='table-head-row']").exists()).toBeTruthy()
      expect(wrapper.find('tr[data-test="table-body-row"').exists()).toBeTruthy()

      // table header
      const header = ['No', 'Owner Address', 'Member Addresses', 'Total Amount', 'Date']
      expect(wrapper.findAll('th').length).toBe(5)
      expect(wrapper.findAll('th').forEach((th, index) => expect(th.text()).toBe(header[index])))

      // table body
      expect(wrapper.findAll('td').length).toBe(sendToWalletEvents.length * header.length)
    })

    it('renders table body correctly', async () => {
      const wrapper = createComponent()

      await flushPromises() // wait for all ticks to complete
      const noElements = wrapper.findAll('td[data-test="table-data-number"]')
      const ownerAddressElements = wrapper.findAll('td[data-test="table-data-owner-address"]')
      const memberAddressesElements = wrapper.findAll('li[data-test="table-data-member-addresses"]')
      const totalAmountElements = wrapper.findAll('td[data-test="table-data-total-amount"]')
      const dateElements = wrapper.findAll('td[data-test="table-data-date"]')

      expect(noElements.length).toBe(sendToWalletEvents.length)
      noElements.forEach((noElement, index) => {
        expect(noElement.text()).toEqual((index + 1).toString())
        expect(ownerAddressElements[index].text()).toEqual(
          sendToWalletEvents[index].args.addressWhoPushes
        )
        expect(totalAmountElements[index].text()).toEqual(`1 ${NETWORK.currencySymbol}`)
        expect(dateElements[index].text()).toEqual('5/3/2021, 12:00:00 AM')

        memberAddressesElements.forEach((memberAddressElement, memberIndex) => {
          expect(memberAddressElement.text()).toEqual(
            sendToWalletEvents[index].args.addresses[memberIndex]
          )
        })
      })
    })

    it('renders loading state when fetching data', async () => {
      const wrapper = createComponent()
      await wrapper.setValue({ loading: true })

      expect(wrapper.findComponent(SkeletonLoading).exists()).toBeTruthy()
    })

    it('renders empty state when there is no data', async () => {
      sendToWalletEvents = []
      const wrapper = createComponent()

      await flushPromises() // wait for all ticks to complete
      expect(wrapper.find("tr[data-test='empty-row']").exists()).toBeTruthy()
    })
  })
})
