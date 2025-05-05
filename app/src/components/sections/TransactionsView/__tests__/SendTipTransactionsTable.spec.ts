import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SendTipTransactionsTable from '@/components/sections/TransactionsView/tables/SendTipTransactonsTable.vue'
import { createTestingPinia } from '@pinia/testing'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import TableComponent from '@/components/TableComponent.vue'
import { formatEther } from 'viem'

let sendTipEvents = [
  {
    transactionHash: '0x1',
    args: {
      from: '0xDepositor1',
      teamMembers: ['0xDepositor2', '0xDepositor3'],
      totalAmount: BigInt('2000000000000000000'), // 2 ETH
      amountPerAddress: BigInt('1000000000000000000') // 1 ETH
    }
  },
  {
    transactionHash: '0x2',
    args: {
      from: '0xDepositor4',
      teamMembers: ['0xDepositor5', '0xDepositor6'],
      totalAmount: BigInt('2000000000000000000'), // 2 ETH
      amountPerAddress: BigInt('1000000000000000000') // 1 ETH
    }
  }
]

vi.mock('@/stores/useToastStore')
vi.mock('viem/actions', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    getLogs: vi.fn(() => sendTipEvents),
    getBlock: vi.fn(() => ({ timestamp: 1640995200 }))
  }
})

window.open = vi.fn()

describe('SendTipTransactionsTable', () => {
  const createComponent = () => {
    return shallowMount(SendTipTransactionsTable, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn
          })
        ],
        stubs: {
          TableComponent: false
        }
      }
    })
  }

  describe('Actions', () => {
    it('should open transaction detail when click on a transaction', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const tableComponent = wrapper.findComponent(TableComponent)
      await tableComponent.vm.$emit('row-click', { transactionHash: '0x1' })

      expect(window.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
    })

    it('should show error toast when get events failed', async () => {
      shallowMount(SendTipTransactionsTable, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn
            })
          ],
          mocks: {
            error: Error('Failed to get send tip events')
          }
        }
      })
      const { addErrorToast } = useToastStore()

      expect(addErrorToast).toHaveBeenCalledWith('Failed to get send tip events')
    })
  })

  describe('Render', () => {
    it('should show table when loading is false', async () => {
      const wrapper = createComponent()

      await flushPromises()
      expect(wrapper.find('[data-test="table-send-tip-transactions"]').exists()).toBeTruthy()
    })

    it('should show SkeletonLoading when loading is true', async () => {
      const wrapper = createComponent()

      await wrapper.setValue({ loading: true })
      expect(wrapper.find('[data-test="table-send-tip-transactions"]').exists()).toBeFalsy()
      expect(wrapper.findComponent(SkeletonLoading).exists()).toBeTruthy()
    })

    it('should show data in the correct format', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const tableComponent = wrapper.findComponent(TableComponent)
      expect(tableComponent.exists()).toBeTruthy()

      const expectedRows = sendTipEvents.map((event, index) => ({
        index: index + 1,
        from: event.args.from,
        teamMembers: event.args.teamMembers,
        totalAmount: `${formatEther(event.args.totalAmount)} ${NETWORK.currencySymbol}`,
        amountPerAddress: `${formatEther(event.args.amountPerAddress)} ${NETWORK.currencySymbol}`,
        date: '1/1/2022, 12:00:00 AM',
        transactionHash: event.transactionHash
      }))

      expect(tableComponent.props('rows')).toEqual(expectedRows)
      expect(tableComponent.props('columns')).toEqual([
        { key: 'index', label: 'N°' },
        { key: 'from', label: 'From' },
        { key: 'teamMembers', label: 'Team Addresses' },
        { key: 'totalAmount', label: 'Total Tip' },
        { key: 'amountPerAddress', label: 'Tip Per Address', class: 'truncate max-w-12' },
        { key: 'date', label: 'Date' }
      ])
    })

    it('should show no send tip transactions when events are empty', async () => {
      sendTipEvents = []
      const wrapper = createComponent()
      await flushPromises()

      const tableComponent = wrapper.findComponent(TableComponent)
      expect(tableComponent.exists()).toBeTruthy()
      expect(tableComponent.props('rows')).toEqual([])
    })
  })
})
