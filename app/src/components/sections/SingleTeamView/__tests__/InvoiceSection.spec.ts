import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import InvoiceSection from '../InvoiceSection.vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import type { Team, Member } from '@/types'
import type { Transaction } from 'ethers'

// Mock the fetch API
vi.mock('node-fetch', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ data: {} })
    })
  )
}))

// Mock the jsPDF and XLSX libraries
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
interface invoiceComponent {
  currentPage: number
  itemsPerPage: number
  selectedCurrency: string
  allTransactions: Transaction[]
  fromDate: string
  formatDate: (timestamp: number) => string
  showTxDetail: (txHash: string) => void
  formatAddress: (address: string, isShort: boolean) => string
  toDate: string
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
})
