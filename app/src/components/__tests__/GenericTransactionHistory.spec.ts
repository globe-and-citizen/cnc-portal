import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import GenericTransactionHistory from '../GenericTransactionHistory.vue'
import type { BaseTransaction } from '@/types/transactions'
import type { ReceiptData } from '@/utils/excelExport'
import Datepicker from '@vuepic/vue-datepicker'
import { NETWORK } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
import { exportTransactionsToExcel } from '@/utils/excelExport'
import { exportTransactionsToPdf } from '@/utils/pdfExport'
// Mock components
vi.mock('@/components/TableComponent.vue', () => ({
  default: {
    name: 'TableComponent',
    template: '<div data-test="table-component"><slot /></div>'
  }
}))

vi.mock('@/components/AddressToolTip.vue', () => ({
  default: {
    name: 'AddressToolTip',
    template: '<div data-test="address-tooltip"><slot /></div>'
  }
}))

vi.mock('@/components/sections/ExpenseAccountView/ReceiptComponent.vue', () => ({
  default: {
    name: 'ReceiptComponent',
    template: '<div data-test="receipt-component"><slot /></div>'
  }
}))

// Mock export functions
vi.mock('@/utils/excelExport', () => ({
  exportReceiptToExcel: vi.fn(),
  exportTransactionsToExcel: vi.fn()
}))

vi.mock('@/utils/pdfExport', () => ({
  exportReceiptToPdf: vi.fn(),
  exportTransactionsToPdf: vi.fn()
}))

// Sample test data
const mockTransactions = [
  {
    txHash: '0x123',
    date: '2024-03-20T10:00:00',
    type: 'deposit',
    from: '0xabc',
    to: '0xdef',
    amountUSD: 100,
    amountEUR: 92,
    receipt: 'https://receipt.url'
  },
  {
    txHash: '0x456',
    date: '2024-03-21T11:00:00',
    type: 'transfer',
    from: '0xghi',
    to: '0xjkl',
    amountUSD: 200,
    amountEUR: 184,
    receipt: undefined
  }
]

const mockCurrencyRates = {
  loading: false,
  error: null,
  getRate: (currency: string) => (currency === 'EUR' ? 0.92 : 1)
}

describe('GenericTransactionHistory', () => {
  interface IGenericTransactionHistory extends ComponentPublicInstance {
    formatDate: (date: string) => string
    formatAmount: (transaction: BaseTransaction, currency: string) => string
    getReceiptUrl: (transaction: BaseTransaction) => string
    formatReceiptData: (transaction: BaseTransaction) => {
      txHash: string
      date: string
      type: string
      from: string
      to: string
      amountUSD: number
      amount: string
      token: string
    }
    handleReceiptExport: (receiptData: ReceiptData) => Promise<void>
    handleReceiptPdfExport: (receiptData: ReceiptData) => Promise<void>
  }
  let wrapper: VueWrapper

  const createWrapper = (props = {}) => {
    return mount(GenericTransactionHistory, {
      props: {
        transactions: mockTransactions,
        title: 'Transaction History',
        currencies: ['USD', 'EUR'],
        currencyRates: mockCurrencyRates,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          TableComponent: true,
          AddressToolTip: true,
          ButtonUI: true,
          Datepicker: true
        }
      }
    })
  }

  beforeEach(() => {
    wrapper = createWrapper()
  })

  it('shows date filter by default', () => {
    const datePicker = wrapper.findComponent(Datepicker)
    expect(datePicker.exists()).toBe(true)
  })

  it('shows export button by default', () => {
    const exportButton = wrapper.find('[data-test="transaction-history-export-button"]')
    expect(exportButton.exists()).toBe(true)
  })

  it('emits export event when export button is clicked', async () => {
    const wrapper = createWrapper()
    vi.mocked(exportTransactionsToExcel).mockReturnValue(true)
    vi.mocked(exportTransactionsToPdf).mockReturnValue(true)

    const exportButton = wrapper.find('[data-test="transaction-history-export-button"]')
    await exportButton.trigger('click')

    expect(exportTransactionsToExcel).toHaveBeenCalled()
    expect(exportTransactionsToPdf).toHaveBeenCalled()
  })

  it('handles failed export when export button is clicked', async () => {
    const wrapper = createWrapper()
    vi.mocked(exportTransactionsToExcel).mockReturnValue(false)
    vi.mocked(exportTransactionsToPdf).mockReturnValue(false)

    const exportButton = wrapper.find('[data-test="transaction-history-export-button"]')
    await exportButton.trigger('click')

    expect(exportTransactionsToExcel).toHaveBeenCalled()
    expect(exportTransactionsToPdf).toHaveBeenCalled()
  })

  it('handles error when export button is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = createWrapper()

    vi.mocked(exportTransactionsToExcel).mockImplementation(() => {
      throw new Error('Test error')
    })
    vi.mocked(exportTransactionsToPdf).mockReturnValue(true)

    const exportButton = wrapper.find('[data-test="transaction-history-export-button"]')
    await exportButton.trigger('click')

    expect(consoleSpy).toHaveBeenCalledWith('Error exporting transactions:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('formats date correctly', () => {
    const formattedDate = (wrapper.vm as unknown as IGenericTransactionHistory).formatDate(
      '2024-03-20T10:00:00'
    )
    expect(formattedDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
  })

  it('formats amounts correctly with currency conversion', () => {
    const transaction = mockTransactions[0]
    const amountEUR = (wrapper.vm as unknown as IGenericTransactionHistory).formatAmount(
      transaction,
      'EUR'
    )
    expect(amountEUR).toBe('92.00')
  })

  it('generates correct receipt URL when receipt is not provided', () => {
    const transaction = mockTransactions[1] // Transaction without receipt
    const receiptUrl = (wrapper.vm as unknown as IGenericTransactionHistory).getReceiptUrl(
      transaction.txHash as unknown as BaseTransaction
    )
    expect(receiptUrl).toBe(`${NETWORK.blockExplorerUrl}/tx/${transaction.txHash}`)
  })

  it('formats receipt data correctly', () => {
    const transaction = mockTransactions[0]
    const receiptData = (wrapper.vm as unknown as IGenericTransactionHistory).formatReceiptData(
      transaction
    )

    expect(receiptData).toEqual({
      txHash: transaction.txHash,
      date: expect.any(String),
      type: transaction.type,
      from: transaction.from,
      to: transaction.to,
      amountUSD: transaction.amountUSD,
      amount: '',
      token: 'undefined'
    })
  })

  it('renders without date filter when showDateFilter is false', () => {
    const wrapper = createWrapper({ showDateFilter: false })
    const datePicker = wrapper.findComponent(Datepicker)
    expect(datePicker.exists()).toBe(false)
  })

  it('renders without export button when showExport is false', () => {
    const wrapper = createWrapper({ showExport: false })
    const exportButton = wrapper.find('[data-test="transaction-history-export-button"]')
    expect(exportButton.exists()).toBe(false)
  })
})
