import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import TransactionHistorySection from '../TransactionHistorySection.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ReceiptComponent from '@/components/sections/ExpenseAccountView/ReceiptComponent.vue'
import TableComponent from '@/components/TableComponent.vue'

describe('TransactionHistorySection', () => {
  describe('Render', () => {
    interface ComponentOptions {
      props?: Record<string, unknown>
      data?: () => Record<string, unknown>
      global?: Record<string, unknown>
    }

    const createComponent = ({
      props = {},
      data = () => ({}),
      global = {}
    }: ComponentOptions = {}) =>
      mount(TransactionHistorySection, {
        props: { ...props },
        data,
        global: { ...global }
      })

    it('should show receipt when receipt is clicked', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const transactionTable = wrapper.findComponent(TableComponent)
      expect(transactionTable.exists()).toBeTruthy()
      expect(transactionTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = transactionTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      const receiptButton = firstRow.findComponent(ButtonUI)
      expect(receiptButton.exists()).toBeTruthy()
      receiptButton.trigger('click')

      await flushPromises()
      expect(wrapper.vm.selectedTxHash).toBe(
        '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e'
      )
      const receiptComponent = wrapper.findComponent(ReceiptComponent)
      expect(receiptComponent.exists()).toBeTruthy()
      // expect(enableButton.props('disabled')).toBe(true)
    })
  })
})
