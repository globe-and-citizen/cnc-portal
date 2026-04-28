import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ReceiptComponent from '@/components/ReceiptComponent.vue'
import { NETWORK } from '@/constant'

const DATE = new Date().toLocaleDateString()
const mockReceiptData = {
  txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
  date: DATE,
  type: 'deposit',
  from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  valueUSD: 10,
  receipt: 'Receipt',
  amount: '0.01',
  token: 'POL'
}

describe('ReceiptComponent', () => {
  interface ComponentOptions {
    props?: Record<string, unknown>
    data?: () => Record<string, unknown>
    global?: Record<string, unknown>
  }

  const createComponent = ({ props = {}, data = () => ({}), global = {} }: ComponentOptions = {}) =>
    mount(ReceiptComponent, {
      props: {
        receiptData: mockReceiptData,
        ...props
      },
      data,
      global
    })
  describe('Render', () => {
    it('should show correct values and labels', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const receiptDataTxHash = wrapper.find('[data-test="receipt-data-txHash"]')
      expect(receiptDataTxHash.exists()).toBeTruthy()
      expect(receiptDataTxHash.html()).toContain('Transaction Hash')

      expect(receiptDataTxHash.html()).toContain(
        `${NETWORK.blockExplorerUrl}/tx/${mockReceiptData.txHash}`
      )

      const receiptDataDate = wrapper.find('[data-test="receipt-data-date"]')
      expect(receiptDataDate.exists()).toBeTruthy()
      expect(receiptDataDate.html()).toContain('Date')
      expect(receiptDataDate.html()).toContain(DATE)

      const receiptDataAmount = wrapper.find('[data-test="receipt-data-amount"]')
      expect(receiptDataAmount.exists()).toBeTruthy()
      expect(receiptDataAmount.html()).toContain('Amount')
      expect(receiptDataAmount.html()).toContain(
        `${mockReceiptData.amount} ${mockReceiptData.token}`
      )

      const receiptDataFrom = wrapper.find('[data-test="receipt-data-from"]')
      expect(receiptDataFrom.exists()).toBeTruthy()
      expect(receiptDataFrom.html()).toContain('Author')

      expect(receiptDataFrom.html()).toContain(
        `${NETWORK.blockExplorerUrl}/address/${mockReceiptData.from}`
      )

      const receiptDataTo = wrapper.find('[data-test="receipt-data-to"]')
      expect(receiptDataTo.exists()).toBeTruthy()
      expect(receiptDataTo.html()).toContain('Recipient')

      expect(receiptDataTo.html()).toContain(
        `${NETWORK.blockExplorerUrl}/address/${mockReceiptData.to}`
      )
    })
  })

  describe('Export', () => {
    it('emits export-excel with receipt data', async () => {
      const wrapper = createComponent()
      const exportExcelButton = wrapper.find('[data-test="export-excel"]')
      await exportExcelButton.trigger('click')
      expect(exportExcelButton.exists()).toBeTruthy()
      expect(wrapper.emitted('export-excel')).toEqual([[mockReceiptData]])
    })

    it('emits export-pdf with receipt data', async () => {
      const wrapper = createComponent()
      const exportPdfButton = wrapper.find('[data-test="export-pdf"]')
      await exportPdfButton.trigger('click')
      expect(exportPdfButton.exists()).toBeTruthy()
      expect(wrapper.emitted('export-pdf')).toEqual([[mockReceiptData]])
    })

    it('renders empty hash when txHash is not provided', async () => {
      const wrapper = createComponent({
        props: {
          receiptData: {
            ...mockReceiptData,
            txHash: undefined
          }
        }
      })
      await flushPromises()

      const txHash = wrapper.find('[data-test="receipt-data-txHash"]')
      expect(txHash.text()).toContain('Transaction Hash')
      expect(txHash.find('a').exists()).toBe(false)
    })
  })
})
