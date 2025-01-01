import { mount } from '@vue/test-utils'
import InvoiceSection from '../InvoiceSection.vue'
import { describe, it, expect, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'

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

describe('InvoiceSection.vue', () => {
  it('renders correctly', () => {
    const wrapper = mount(InvoiceSection, {
      props: {
        team: {}
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
    expect(wrapper.text()).toContain('Transaction Invoices')
  })
})
