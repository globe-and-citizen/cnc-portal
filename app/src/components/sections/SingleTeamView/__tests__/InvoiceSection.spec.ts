import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import InvoiceSection from '../InvoiceSection.vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import type { Team } from '@/types'

// Custom transaction type for our component
interface CustomTransaction {
  type: string
  from: string
  to: string
  amount: bigint
  hash: string
  date: number
  isToken: boolean
}

// Mock the fetch API
vi.mock('node-fetch', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          data: {
            '2024-01-01': {
              USD: 1,
              INR: 83.24,
              CAD: 1.35
            }
          }
        })
    })
  )
}))

// Mock modules
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    autoTable: vi.fn()
  }))
}))

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn()
  },
  writeFile: vi.fn()
}))

interface TransactionWithAmount {
  amount: bigint
  isToken: boolean
  date: number
  type?: string
  from?: string
  to?: string
  hash?: string
}

interface invoiceComponent {
  currentPage: number
  itemsPerPage: number
  selectedCurrency: string
  allTransactions: CustomTransaction[]
  fromDate: string
  formatDate: (timestamp: number) => string
  showTxDetail: (txHash: string) => void
  formatAddress: (address: string, isShort: boolean) => string
  toDate: string
  downloadPDF: () => Promise<void>
  downloadExcel: () => void
  fetchExchangeRates: (date: string) => Promise<void>
  formatAmount: (tx: TransactionWithAmount) => {
    original: string
    converted: string
    convertedUSDC: string
  }
  filteredTransactions: CustomTransaction[]
}

describe('InvoiceSection.vue', () => {
  let wrapper: VueWrapper

  const mockTeam: Partial<Team> = {
    bankAddress: '0x123',
    members: [
      { id: '1', teamId: 1, address: '0x123', name: 'John' },
      { id: '2', teamId: 1, address: '0x456', name: 'Jane' }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()

    wrapper = mount(InvoiceSection, {
      props: {
        team: mockTeam
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  })

  it('renders correctly', () => {
    expect(wrapper.text()).toContain('Transaction Invoices')
  })

  it('initializes with default values', () => {
    expect((wrapper.vm as unknown as invoiceComponent).currentPage).toBe(1)
    expect((wrapper.vm as unknown as invoiceComponent).itemsPerPage).toBe(10)
    expect((wrapper.vm as unknown as invoiceComponent).selectedCurrency).toBe('USD')
    expect((wrapper.vm as unknown as invoiceComponent).allTransactions).toEqual([])
  })

  it('updates date filters correctly', async () => {
    const fromDateInput = wrapper.find('input[type="date"]')
    await fromDateInput.setValue('2024-01-01')
    expect((wrapper.vm as unknown as invoiceComponent).fromDate).toBe('2024-01-01')
    expect((wrapper.vm as unknown as invoiceComponent).currentPage).toBe(1) // Should reset to page 1 on filter change
  })

  it('updates currency selection correctly', async () => {
    const currencySelect = wrapper.find('select')
    await currencySelect.setValue('INR')
    expect((wrapper.vm as unknown as invoiceComponent).selectedCurrency).toBe('INR')
  })

  it('formats addresses correctly', () => {
    expect((wrapper.vm as unknown as invoiceComponent).formatAddress('0x123', true)).toBe(
      'John (0x123...x123)'
    )
    expect((wrapper.vm as unknown as invoiceComponent).formatAddress('0x789', true)).toBe(
      '0x789...x789'
    )
    expect((wrapper.vm as unknown as invoiceComponent).formatAddress('0x789', false)).toBe('0x789')
  })

  it('handles pagination correctly', async () => {
    ;(wrapper.vm as unknown as invoiceComponent).itemsPerPage = 5
    expect((wrapper.vm as unknown as invoiceComponent).itemsPerPage).toBe(5)

    expect((wrapper.vm as unknown as invoiceComponent).currentPage).toBe(1)
  })

  it('disables download buttons when no transactions', () => {
    const downloadButtons = wrapper
      .findAll('button')
      .filter(
        (btn: DOMWrapper<HTMLButtonElement>) =>
          btn.text().includes('Download PDF') || btn.text().includes('Download Excel')
      )

    downloadButtons.forEach((button: DOMWrapper<HTMLButtonElement>) => {
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  it('formats date correctly', () => {
    const timestamp = 1672531200000 // 2023-01-01
    const formattedDate = (wrapper.vm as unknown as invoiceComponent).formatDate(timestamp)
    expect(formattedDate).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
  })

  it('handles transaction detail view', () => {
    const mockTxHash = '0x123'
    const windowSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    ;(wrapper.vm as unknown as invoiceComponent).showTxDetail(mockTxHash)

    expect(windowSpy).toHaveBeenCalled()
    windowSpy.mockRestore()
  })

  describe('Exchange rates and amount formatting', () => {
    it('fetches exchange rates correctly', async () => {
      const date = '2024-01-01'
      const vm = wrapper.vm as unknown as invoiceComponent
      await vm.fetchExchangeRates(date)

      const formattedAmount = vm.formatAmount({
        amount: BigInt('1000000000000000000'),
        isToken: false,
        date: new Date('2024-01-01').getTime()
      })

      expect(formattedAmount.original).toContain('1.00')
      expect(formattedAmount.convertedUSDC).toContain('1.00')
    })

    it('handles different currencies correctly', async () => {
      const vm = wrapper.vm as unknown as invoiceComponent
      vm.selectedCurrency = 'INR'
      const date = '2024-01-01'
      await vm.fetchExchangeRates(date)

      const formattedAmount = vm.formatAmount({
        amount: BigInt('1000000000000000000'),
        isToken: false,
        date: new Date('2024-01-01').getTime()
      })

      expect(formattedAmount.convertedUSDC).toContain('INR')
    })
  })

  describe('Transaction filtering', () => {
    it('filters transactions by date range', async () => {
      const transactions: CustomTransaction[] = [
        {
          type: 'Deposit',
          from: '0x123',
          to: '0x456',
          amount: BigInt('1000000000000000000'),
          hash: '0xabc',
          date: new Date('2024-01-01').getTime(),
          isToken: false
        },
        {
          type: 'Transfer',
          from: '0x789',
          to: '0x123',
          amount: BigInt('2000000000000000000'),
          hash: '0xdef',
          date: new Date('2024-02-01').getTime(),
          isToken: false
        }
      ]

      const vm = wrapper.vm as unknown as invoiceComponent
      vm.allTransactions = transactions
      vm.fromDate = '2024-01-01'
      vm.toDate = '2024-01-31'

      expect(vm.filteredTransactions.length).toBe(1)
      expect(vm.filteredTransactions[0].hash).toBe('0xabc')
    })

    it('sorts transactions by date in descending order', async () => {
      const transactions: CustomTransaction[] = [
        {
          type: 'Deposit',
          from: '0x123',
          to: '0x456',
          amount: BigInt('1000000000000000000'),
          hash: '0xabc',
          date: new Date('2024-01-01').getTime(),
          isToken: false
        },
        {
          type: 'Transfer',
          from: '0x789',
          to: '0x123',
          amount: BigInt('2000000000000000000'),
          hash: '0xdef',
          date: new Date('2024-02-01').getTime(),
          isToken: false
        }
      ]

      const vm = wrapper.vm as unknown as invoiceComponent
      vm.allTransactions = transactions

      expect(vm.filteredTransactions[0].hash).toBe('0xdef')
      expect(vm.filteredTransactions[1].hash).toBe('0xabc')
    })
  })
})
