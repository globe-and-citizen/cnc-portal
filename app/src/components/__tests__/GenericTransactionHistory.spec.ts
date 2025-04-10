import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import GenericTransactionHistory from '../GenericTransactionHistory.vue'
import type { BaseTransaction } from '@/types/transactions'
import type { ReceiptData } from '@/utils/excelExport'
import Datepicker from '@vuepic/vue-datepicker'
import { NETWORK } from '@/constant'
import { createTestingPinia } from '@pinia/testing'
import { exportTransactionsToExcel, exportReceiptToExcel } from '@/utils/excelExport'
import { exportTransactionsToPdf, exportReceiptToPdf } from '@/utils/pdfExport'

vi.mock('@/utils/excelExport', () => ({
  exportReceiptToExcel: vi.fn(),
  exportTransactionsToExcel: vi.fn()
}))

vi.mock('@/utils/pdfExport', () => ({
  exportReceiptToPdf: vi.fn(),
  exportTransactionsToPdf: vi.fn()
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: () => ({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  })
}))

vi.mock('@/stores/currencyStore', () => ({
  useCurrencyStore: () => ({
    currency: { code: 'USD', name: 'US Dollar', symbol: '$' },
    nativeTokenPrice: { value: 1800 },
    nativeTokenPriceInUSD: { value: 1800 },
    isLoading: false,
    setCurrency: vi.fn(),
    fetchNativeTokenPrice: vi.fn()
  })
}))

const mockTransactions = [
  {
    txHash: '0x123',
    date: '2024-03-20T10:00:00',
    type: 'deposit',
    from: '0xabc',
    to: '0xdef',
    amountUSD: 100,
    amountEUR: 92,
    receipt: 'https://receipt.url',
    amount: '100',
    token: 'USDC'
  },
  {
    txHash: '0x456',
    date: '2024-03-21T11:00:00',
    type: 'transfer',
    from: '0xghi',
    to: '0xjkl',
    amountUSD: 200,
    amountEUR: 184,
    receipt: undefined,
    amount: '0.1',
    token: 'ETH'
  },
  {
    txHash: '0x789',
    date: '2024-03-22T12:00:00',
    type: 'withdrawal',
    from: '0xmno',
    to: '0xpqr',
    amountUSD: 150,
    amountEUR: 138,
    receipt: undefined,
    amount: '0.05',
    token: 'ETH'
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
      amount: string
      token: string
      amountUSD: number
      valueUSD: string
      valueLocal: string
    }
    handleReceiptExport: (receiptData: ReceiptData) => Promise<void>
    handleReceiptPdfExport: (receiptData: ReceiptData) => Promise<void>
    handleReceiptClick: (transaction: BaseTransaction) => void
    displayedTransactions: BaseTransaction[]
    dateRange: [Date, Date] | null
    receiptModal: boolean
    selectedTransaction: BaseTransaction | null
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
          Datepicker: true
        }
      }
    })
  }

  beforeEach(() => {
    wrapper = createWrapper()
  })

  it('shows export button by default', () => {
    const wrapper = createWrapper({ showExport: true })
    console.log(wrapper.html())

    const exportButton = wrapper.find('[data-test="transaction-history-export-button"]')
    expect(exportButton.exists()).toBe(true)
  })

  it('handles error when export button is clicked', async () => {
    const wrapper = createWrapper({ showExport: true })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

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
    const amountUSD = (wrapper.vm as unknown as IGenericTransactionHistory).formatAmount(
      transaction,
      'USD'
    )
    expect(amountUSD).toBe('$100.00')
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
      amount: transaction.amount,
      token: transaction.token,
      amountUSD: transaction.amountUSD,
      valueUSD: '$100.00',
      valueLocal: '$100.00'
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

  it('filters transactions by date range', async () => {
    const wrapper = createWrapper({ showDateFilter: true })
    const vm = wrapper.vm as unknown as IGenericTransactionHistory

    const startDate = new Date('2024-03-20T00:00:00')
    const endDate = new Date('2024-03-20T23:59:59')

    vm.dateRange = [startDate, endDate]

    expect(vm.displayedTransactions.length).toBe(1)
    expect(vm.displayedTransactions[0].txHash).toBe('0x123')
  })

  it('shows all transactions when no date range is set', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as IGenericTransactionHistory

    expect(vm.displayedTransactions.length).toBe(mockTransactions.length)
  })

  it('handles invalid date format gracefully', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as IGenericTransactionHistory

    const formattedDate = vm.formatDate('invalid-date')
    expect(formattedDate).toBe('Invalid Date')
  })

  it('formats USDC token amounts correctly', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as IGenericTransactionHistory

    const transaction = mockTransactions[0] // USDC transaction
    const amountUSD = vm.formatAmount(transaction, 'USD')

    expect(amountUSD).toBe('$100.00')
  })

  it('formats ETH token amounts correctly', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as IGenericTransactionHistory

    const ethTransaction: BaseTransaction = {
      ...mockTransactions[1],
      amountUSD: 0 // Set to 0 instead of undefined to match the type
    }

    const currencyStoreMock = {
      nativeTokenPrice: 1800,
      getRate: (currency: string) => (currency === 'EUR' ? 0.92 : 1)
    }

    const originalFormatAmount = vm.formatAmount
    vm.formatAmount = (transaction: BaseTransaction, currency: string) => {
      if (transaction.token === 'ETH') {
        const tokenAmount = Number(transaction.amount)
        const usdAmount = tokenAmount * currencyStoreMock.nativeTokenPrice

        if (currency === 'USD') {
          return usdAmount.toFixed(2)
        }

        const targetRate = currencyStoreMock.getRate(currency)
        if (targetRate > 0) {
          const convertedAmount = usdAmount * targetRate
          return convertedAmount.toFixed(2)
        }
      }
      return originalFormatAmount(transaction, currency)
    }

    const amountUSD = vm.formatAmount(ethTransaction, 'USD')

    expect(amountUSD).toBe('180.00')
  })

  it('handles receipt click when showReceiptModal is true', async () => {
    const wrapper = createWrapper({ showReceiptModal: true })
    const vm = wrapper.vm as unknown as IGenericTransactionHistory

    vm.handleReceiptClick(mockTransactions[0])

    expect(vm.receiptModal).toBe(true)
    expect(vm.selectedTransaction).toEqual(mockTransactions[0])
  })

  it('handles receipt export correctly', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as IGenericTransactionHistory

    vi.mocked(exportReceiptToExcel).mockReturnValue(true)

    const receiptData = {
      txHash: '0x123',
      date: '2024-03-20',
      type: 'deposit',
      from: '0xabc',
      to: '0xdef',
      amountUSD: 100,
      amount: '100',
      token: 'USDC',
      amountEUR: 92
    }

    await vm.handleReceiptExport(receiptData)

    expect(exportReceiptToExcel).toHaveBeenCalledWith(receiptData)
  })

  it('handles receipt PDF export correctly', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as IGenericTransactionHistory

    vi.mocked(exportReceiptToPdf).mockReturnValue(true)

    const receiptData = {
      txHash: '0x123',
      date: '2024-03-20',
      type: 'deposit',
      from: '0xabc',
      to: '0xdef',
      amountUSD: 100,
      amount: '100',
      token: 'USDC',
      amountEUR: 92
    }

    await vm.handleReceiptPdfExport(receiptData)

    expect(exportReceiptToPdf).toHaveBeenCalledWith(receiptData)
  })

  it('handles receipt export error correctly', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as IGenericTransactionHistory

    vi.mocked(exportReceiptToExcel).mockImplementation(() => {
      throw new Error('Export error')
    })

    const receiptData = {
      txHash: '0x123',
      date: '2024-03-20',
      type: 'deposit',
      from: '0xabc',
      to: '0xdef',
      amountUSD: 100,
      amount: '100',
      token: 'USDC',
      amountEUR: 92
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await vm.handleReceiptExport(receiptData)

    expect(consoleSpy).toHaveBeenCalledWith('Error exporting receipt:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('renders receipt button when showReceiptModal is true', () => {
    const mockTableComponent = {
      template: `
        <div>
          <button data-test="transaction-history-receipt-button">Receipt</button>
        </div>
      `
    }

    const testWrapper = mount(GenericTransactionHistory, {
      props: {
        transactions: mockTransactions,
        title: 'Transaction History',
        currencies: ['USD', 'EUR'],
        currencyRates: mockCurrencyRates,
        showReceiptModal: true
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          TableComponent: mockTableComponent,
          AddressToolTip: true,
          Datepicker: true,
          ModalComponent: true,
          CustomDatePicker: true
        }
      }
    })

    const receiptButton = testWrapper.find('[data-test="transaction-history-receipt-button"]')
    expect(receiptButton.exists()).toBe(true)
  })
})
