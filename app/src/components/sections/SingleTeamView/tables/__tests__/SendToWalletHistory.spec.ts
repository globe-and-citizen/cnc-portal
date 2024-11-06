import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import SendToWalletHistory from '@/components/sections/SingleTeamView/tables/SendToWalletHistory.vue'
import { createTestingPinia } from '@pinia/testing'
// import { getBlock, getLogs } from '@/__mocks__/viem/actions'

const sendToWalletEvents = [
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

  describe('Render', () => {
    it('renders correctly', async () => {
      // basic render
      const wrapper = createComponent()
      await flushPromises() //  promise is resolved immediately
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

    // it('renders table body correctly', () => {
    //   const wrapper = createComponent()
    //   const tableData = wrapper.findAll('td')
    //   const no = tableData[0].text()
    //   const ownerAddress = tableData[1].text()
    //   const memberAddresses = tableData[2].text()
    //   const totalAmount = tableData[3].text()
    //   const date = tableData[4].text()

    //   expect(no).toEqual('1')
    //   expect(ownerAddress).toEqual(sendToWalletEvents[0].data[0])
    //   expect(memberAddresses).toEqual(sendToWalletEvents[0].data[1].join(''))
    //   expect(totalAmount).toEqual(`1 ${NETWORK.currencySymbol}`)
    //   expect(date).toEqual(sendToWalletEvents[0].date)
    // })
  })

  // describe('Actions', () => {
  //   it('opens transaction detail in a new window when a row is clicked', async () => {
  //     global.open = vi.fn() // Mock window.open
  //     const wrapper = createComponent()

  //     const row = wrapper.findAll('tbody tr')[0]
  //     await row.trigger('click')
  //     expect(global.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
  //   })
  // })
})
