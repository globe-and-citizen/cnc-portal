import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TipWithdrawalTransactionsTable from '@/components/sections/TransactionsView/tables/TipWithdrawalTransactionsTable.vue'
import { createTestingPinia } from '@pinia/testing'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

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
  const original: Object = await importOriginal()
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
        ]
      }
    })
  }

  describe('Actions', () => {
    it('should open transaction detail when click on a transaction', async () => {
      const wrapper = createComponent()

      await flushPromises()
      await wrapper.find('tr[data-test="table-body-row"]').trigger('click')
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

      const numberElements = wrapper.findAll('td[data-test="data-row-number"]')
      const toElements = wrapper.findAll('td[data-test="data-row-to"]')
      const amountElements = wrapper.findAll('td[data-test="data-row-amount"]')

      const dateElements = wrapper.findAll('td[data-test="data-row-date"]')

      expect(wrapper.findAll('tr[data-test="table-body-row"]')).toHaveLength(
        tipWithdrawalEvents.length
      )
      expect(numberElements).toHaveLength(tipWithdrawalEvents.length)
      expect(toElements).toHaveLength(tipWithdrawalEvents.length)
      expect(amountElements).toHaveLength(tipWithdrawalEvents.length)
      expect(dateElements).toHaveLength(tipWithdrawalEvents.length)

      tipWithdrawalEvents.forEach((event, index) => {
        expect(numberElements[index].text()).toBe((index + 1).toString())
        expect(toElements[index].text()).toBe(event.args.to)
        expect(amountElements[index].text()).toBe(`2 ${NETWORK.currencySymbol}`)
        expect(dateElements[index].text()).toBe('1/1/2022, 12:00:00 AM')
      })
    })

    it('should show no tip withdrawal transactions when events are empty', async () => {
      tipWithdrawalEvents = []
      const wrapper = createComponent()

      await flushPromises()
      expect(wrapper.find('tbody').findAll('tr')).toHaveLength(1)
      expect(wrapper.findAll('td')[0].text()).toBe('No TipWithdrawal Transactions')
    })
  })
})
