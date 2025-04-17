import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TipWithdrawalTransactionsTable from '@/components/sections/TransactionsView/tables/TipWithdrawalTransactionsTable.vue'
import { createTestingPinia } from '@pinia/testing'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import TableComponent from '@/components/TableComponent.vue'

let tipWithdrawalEvents = [
  {
    transactionHash: '0x1',
    args: {
      to: '0xReceiver1',
      amount: '2000000000000000000' // 2 ETH
    }
  },
  {
    transactionHash: '0x2',
    args: {
      to: '0xReceiver2',
      amount: '2000000000000000000' // 2 ETH
    }
  }
]

vi.mock('@/stores/useToastStore')
vi.mock('viem/actions', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    getLogs: vi.fn(() => tipWithdrawalEvents),
    getBlock: vi.fn(() => ({ timestamp: 1640995200 }))
  }
})

window.open = vi.fn()

describe('TipWithdrawalTransactionsTable', () => {
  const createComponent = () => {
    return shallowMount(TipWithdrawalTransactionsTable, {
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
      tableComponent.vm.$emit('row-click', { transactionHash: '0x1' })

      expect(window.open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x1`, '_blank')
    })

    it('should show error toast when get events failed', async () => {
      shallowMount(TipWithdrawalTransactionsTable, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn
            })
          ],
          mocks: {
            error: Error('Failed to get withdrawal tip events')
          }
        }
      })
      const { addErrorToast } = useToastStore()

      expect(addErrorToast).toHaveBeenCalledWith('Failed to get withdrawal tip events')
    })
  })

  describe('Render', () => {
    it('should show table when loading is false', async () => {
      const wrapper = createComponent()

      await flushPromises()
      expect(wrapper.find('[data-test="table-tip-withdrawal-transactions"]').exists()).toBeTruthy()
    })

    it('should show SkeletonLoading when loading is true', async () => {
      const wrapper = createComponent()

      await wrapper.setValue({ loading: true })
      expect(wrapper.find('[data-test="table-tip-withdrawal-transactions"]').exists()).toBeFalsy()
      expect(wrapper.findComponent(SkeletonLoading).exists()).toBeTruthy()
    })

    it('should show data in the correct format', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const tableComponent = wrapper.findComponent(TableComponent)
      expect(tableComponent.exists()).toBeTruthy()

      const expectedRows = tipWithdrawalEvents.map((event, index) => ({
        index: index + 1,
        to: event.args.to,
        amount: `2 ${NETWORK.currencySymbol}`,
        date: '1/1/2022, 12:00:00 AM',
        transactionHash: event.transactionHash
      }))

      expect(tableComponent.props('rows')).toEqual(expectedRows)
      expect(tableComponent.props('columns')).toEqual([
        { key: 'index', label: 'N°' },
        { key: 'to', label: 'To' },
        { key: 'amount', label: 'Amount' },
        { key: 'date', label: 'Date' }
      ])
    })

    it('should show no tip withdrawal transactions when events are empty', async () => {
      tipWithdrawalEvents = []
      const wrapper = createComponent()
      await flushPromises()

      const tableComponent = wrapper.findComponent(TableComponent)
      expect(tableComponent.exists()).toBeTruthy()
      expect(tableComponent.props('rows')).toEqual([])
    })
  })
})
