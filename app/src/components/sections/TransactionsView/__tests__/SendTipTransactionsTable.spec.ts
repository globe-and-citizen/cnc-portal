import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SendTipTransactonsTable from '@/components/sections/TransactionsView/tables/SendTipTransactonsTable.vue'
import { createTestingPinia } from '@pinia/testing'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { useTipEvents } from '@/composables/__mocks__/tips'
import { NETWORK } from '@/constant'
import type { Result } from 'ethers'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

vi.mock('@/composables/tips')
vi.mock('@/stores/useToastStore')

const mockWindowOpen = vi.fn()
window.open = mockWindowOpen

describe('SendTipTransactionsTable', () => {
  const createComponent = () => {
    return shallowMount(SendTipTransactonsTable, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  describe('Render', () => {
    it('should show table when loading is false', () => {
      const wrapper = createComponent()
      expect(wrapper.find('[data-test="table-send-tip-transactions"]').exists()).toBeTruthy()
    })

    it('should not show SkeletonLoading when loading is false', () => {
      const wrapper = createComponent()
      expect(wrapper.findComponent(SkeletonLoading).exists()).toBeFalsy()
    })

    it('should show SkeletonLoading when loading is true', async () => {
      const wrapper = createComponent()
      const { loading } = useTipEvents()
      loading.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(SkeletonLoading).exists()).toBeTruthy()
    })

    it('should not show table when loading is true', async () => {
      const wrapper = createComponent()
      const { loading } = useTipEvents()
      loading.value = true
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="table-send-tip-transactions"]').exists()).toBeFalsy()
    })

    it('should show table data when events are not empty', async () => {
      const wrapper = createComponent()
      const { events, loading } = useTipEvents()
      loading.value = false
      events.value = [
        {
          txHash: '0x123',
          data: [
            '0xDepositor1',
            ['0xDepositor2', '0xDepositor3'],
            '2000000000000000000',
            '1000000000000000000'
          ] as Result,
          date: '01/01/2022 00:00'
        }
      ]
      await wrapper.vm.$nextTick()
      expect(wrapper.find('tbody').exists()).toBeTruthy()
      expect(wrapper.find('tbody').findAll('tr')).toHaveLength(1)
    })

    it('should show data in the correct format', async () => {
      const wrapper = createComponent()
      const { events, loading } = useTipEvents()
      loading.value = false
      events.value = [
        {
          txHash: '0x123',
          data: [
            '0xDepositor1',
            ['0xDepositor2', '0xDepositor3'],
            '2000000000000000000',
            '1000000000000000000'
          ] as Result,
          date: '01/01/2022 00:00'
        }
      ]
      await wrapper.vm.$nextTick()
      expect(wrapper.findAll('td')[0].text()).toBe('1')
      expect(wrapper.findAll('td')[1].text()).toBe('0xDepositor1')
      expect(wrapper.findAll('td')[2].text()).toBe('0xDepositor20xDepositor3')
      expect(wrapper.findAll('td')[3].text()).toBe(`2.0 ${NETWORK.currencySymbol}`)
      expect(wrapper.findAll('td')[4].text()).toBe(`1.0 ${NETWORK.currencySymbol}`)
      expect(wrapper.findAll('td')[5].text()).toBe('01/01/2022 00:00')
    })

    it('should show no data message when events are empty', async () => {
      const wrapper = createComponent()
      const { events, loading } = useTipEvents()
      loading.value = false
      events.value = []
      await wrapper.vm.$nextTick()
      expect(wrapper.find('tbody').findAll('tr')).toHaveLength(1)
      expect(wrapper.findAll('td')[0].text()).toBe('No SendTip Transactions')
    })
  })

  describe('Events', () => {
    it('should get events when mounted', () => {
      createComponent()
      const { getEvents } = useTipEvents()
      getEvents()
      expect(getEvents).toHaveBeenCalled()
    })

    it('should open transaction detail when click on a transaction', async () => {
      const wrapper = createComponent()
      const { events, loading } = useTipEvents()
      loading.value = false
      events.value = [
        {
          txHash: '0x123',
          data: [
            '0xDepositor1',
            ['0xDepositor2', '0xDepositor3'],
            '2000000000000000000',
            '1000000000000000000'
          ] as Result,
          date: '01/01/2022 00:00'
        }
      ]
      await wrapper.vm.$nextTick()
      await wrapper.find('tbody').find('tr').trigger('click')
      expect(mockWindowOpen).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/0x123`, '_blank')
    })

    it('should show error toast when get events failed', async () => {
      const wrapper = createComponent()
      const { error } = useTipEvents()
      const { addErrorToast } = useToastStore()
      error.value = Error('Failed to get send tip events')

      await wrapper.vm.$nextTick()
      expect(addErrorToast).toHaveBeenCalledWith('Failed to get send tip events')
    })
  })
})
