import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PushTipTransactionsTable from '@/components/sections/TransactionsView/tables/PushTipTransactionsTable.vue'
import { createTestingPinia } from '@pinia/testing'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { NETWORK } from '@/constant'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

let pushTipEvents = [
  {
    transactionHash: '0x1',
    args: {
      from: '0xDepositor1',
      teamMembers: ['0xDepositor2', '0xDepositor3'],
      totalAmount: '2000000000000000000', // 2 ETH
      amountPerAddress: '1000000000000000000' // 1 ETH
    }
  },
  {
    transactionHash: '0x2',
    args: {
      from: '0xDepositor4',
      teamMembers: ['0xDepositor5', '0xDepositor6'],
      totalAmount: '2000000000000000000', // 2 ETH
      amountPerAddress: '1000000000000000000' // 1 ETH
    }
  }
]

vi.mock('@/stores/useToastStore')
vi.mock('viem/actions', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    getLogs: vi.fn(() => pushTipEvents),
    getBlock: vi.fn(() => ({ timestamp: 1640995200 }))
  }
})

window.open = vi.fn()

describe('PushTipTransactionsTable', () => {
  const createComponent = () => {
    return shallowMount(PushTipTransactionsTable, {
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
      shallowMount(PushTipTransactionsTable, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn
            })
          ],
          mocks: {
            error: Error('Failed to get push tip events')
          }
        }
      })
      const { addErrorToast } = useToastStore()

      expect(addErrorToast).toHaveBeenCalledWith('Failed to get push tip events')
    })
  })

  describe('Render', () => {
    it('should show table when loading is false', async () => {
      const wrapper = createComponent()

      await flushPromises()
      expect(wrapper.find('[data-test="table-push-tip-transactions"]').exists()).toBeTruthy()
    })

    it('should show SkeletonLoading when loading is true', async () => {
      const wrapper = createComponent()

      await wrapper.setValue({ loading: true })
      expect(wrapper.find('[data-test="table-push-tip-transactions"]').exists()).toBeFalsy()
      expect(wrapper.findComponent(SkeletonLoading).exists()).toBeTruthy()
    })

    it('should show data in the correct format', async () => {
      const wrapper = createComponent()

      await flushPromises()

      const numberElements = wrapper.findAll('td[data-test="data-row-number"]')
      const fromElements = wrapper.findAll('td[data-test="data-row-from"]')
      const teamMembersElements = wrapper.findAll('td[data-test="data-row-member"]')
      const totalAmountElements = wrapper.findAll('td[data-test="data-row-total-amount"]')
      const amountPerAddressElements = wrapper.findAll(
        'td[data-test="data-row-amount-per-address"]'
      )
      const dateElements = wrapper.findAll('td[data-test="data-row-date"]')

      expect(wrapper.findAll('tr[data-test="table-body-row"]')).toHaveLength(pushTipEvents.length)
      expect(numberElements).toHaveLength(pushTipEvents.length)
      expect(fromElements).toHaveLength(pushTipEvents.length)
      expect(totalAmountElements).toHaveLength(pushTipEvents.length)
      expect(amountPerAddressElements).toHaveLength(pushTipEvents.length)
      expect(dateElements).toHaveLength(pushTipEvents.length)

      pushTipEvents.forEach((event, index) => {
        expect(numberElements[index].text()).toBe((index + 1).toString())
        expect(fromElements[index].text()).toBe(event.args.from)
        expect(totalAmountElements[index].text()).toBe(`2 ${NETWORK.currencySymbol}`)
        expect(amountPerAddressElements[index].text()).toBe(`1 ${NETWORK.currencySymbol}`)
        expect(dateElements[index].text()).toBe('1/1/2022, 12:00:00 AM')

        teamMembersElements.forEach((teamMemberElement, teamMemberIndex) => {
          expect(teamMemberElement.text()).toBe(event.args.teamMembers[teamMemberIndex])
        })
      })
    })

    it('should show no push tip transactions when events are empty', async () => {
      pushTipEvents = []
      const wrapper = createComponent()

      await flushPromises()
      expect(wrapper.find('tbody').findAll('tr')).toHaveLength(1)
      expect(wrapper.findAll('td')[0].text()).toBe('No PushTip Transactions')
    })
  })
})
