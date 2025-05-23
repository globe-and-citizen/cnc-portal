import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  exportReceiptToPdf,
  exportTransactionsToPdf,
  createTableLayout,
  createHeader,
  createFooter,
  getColumnAlignment
} from '../pdfExport'
import pdfMake from 'pdfmake/build/pdfmake'
import testData from './pdfExportTestData.json'

// Mock pdfmake
vi.mock('pdfmake/build/pdfmake', () => ({
  default: {
    fonts: {},
    createPdf: vi.fn().mockReturnValue({
      download: vi.fn()
    })
  }
}))

// Mock fetch and FileReader
global.fetch = vi.fn()
const mockFileReader = {
  readAsDataURL: vi.fn(),
  onloadend: null,
  onerror: null,
  result: 'data:image/png;base64,test'
}

vi.stubGlobal(
  'FileReader',
  vi.fn(() => mockFileReader)
)

describe('pdfExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockReset()
    mockFileReader.readAsDataURL.mockReset()
  })

  describe('getBase64Image', () => {
    it('should handle image loading error gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await exportReceiptToPdf(testData.exportReceiptToPdf.basicReceipt)

      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith('Error loading image:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('createTableLayout', () => {
    it('should create correct table layout configuration', () => {
      const layout = createTableLayout()
      const mockNode = { table: { body: [1, 2, 3] } }

      expect(layout.hLineWidth(0, mockNode)).toBe(1)
      expect(layout.hLineWidth(1, mockNode)).toBe(1)
      expect(layout.hLineWidth(2, mockNode)).toBe(0.5)
      expect(layout.hLineWidth(3, mockNode)).toBe(1)

      expect(layout.vLineWidth()).toBe(0)

      expect(layout.hLineColor(0, mockNode)).toBe('#e5e7eb')
      expect(layout.hLineColor(1, mockNode)).toBe('#e5e7eb')
      expect(layout.hLineColor(2, mockNode)).toBe('#f3f4f6')
      expect(layout.hLineColor(3, mockNode)).toBe('#e5e7eb')

      expect(layout.fillColor(0)).toBe('#f9fafb')
      expect(layout.fillColor(1)).toBe(null)

      expect(layout.paddingLeft()).toBe(8)
      expect(layout.paddingRight()).toBe(8)
      expect(layout.paddingTop()).toBe(12)
      expect(layout.paddingBottom()).toBe(12)
    })
  })

  describe('createHeader', () => {
    it('should create header with logo', () => {
      const header = createHeader('base64logo', 'Test Title')

      expect(header.columns).toHaveLength(2)
      expect(header.columns[0]).toHaveProperty('image', 'base64logo')
      expect(header.columns[1]).toHaveProperty('text', 'Test Title')
    })

    it('should create header without logo', () => {
      const header = createHeader('', 'Test Title')

      expect(header.columns).toHaveLength(2)
      expect(header.columns[0]).toHaveProperty('text', '')
      expect(header.columns[1]).toHaveProperty('text', 'Test Title')
    })
  })

  describe('createFooter', () => {
    it('should create footer with correct content', () => {
      const footer = createFooter()

      expect(footer.columns).toHaveLength(2)
      expect(footer.columns[0]).toHaveProperty('text', 'Generated by Globe & Citizen')
      expect(footer.columns[1]).toHaveProperty('text', expect.any(String))
    })
  })

  describe('getColumnAlignment', () => {
    it('should return correct alignment for different column types', () => {
      expect(getColumnAlignment('Amount')).toBe('right')
      expect(getColumnAlignment('Value (USD)')).toBe('right')
      expect(getColumnAlignment('Date')).toBe('center')
      expect(getColumnAlignment('Transaction Hash')).toBe('left')
      expect(getColumnAlignment('Type')).toBe('left')
    })
  })

  describe('exportReceiptToPdf', () => {
    it('should export receipt data with correct format', async () => {
      const result = await exportReceiptToPdf(testData.exportReceiptToPdf.basicReceipt)

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              fontSize: 12,
              color: expect.any(String)
            }),
            expect.objectContaining({
              table: expect.objectContaining({
                headerRows: 1,
                widths: ['30%', '70%']
              })
            })
          ])
        })
      )
    })

    it('should include additional currency amounts in the export', async () => {
      const result = await exportReceiptToPdf(testData.exportReceiptToPdf.multiCurrencyReceipt)

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              table: expect.objectContaining({
                body: expect.arrayContaining([
                  expect.arrayContaining([
                    expect.objectContaining({ text: 'Field' }),
                    expect.objectContaining({ text: 'Value' })
                  ]),
                  expect.arrayContaining([
                    expect.objectContaining({ text: 'Value (USD)' }),
                    expect.any(Object)
                  ])
                ])
              })
            })
          ])
        })
      )
    })

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(pdfMake.createPdf).mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      const result = await exportReceiptToPdf(testData.exportReceiptToPdf.basicReceipt)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('exportTransactionsToPdf', () => {
    it('should export transactions with correct format', async () => {
      const result = await exportTransactionsToPdf(
        testData.exportTransactionsToPdf.headers,
        testData.exportTransactionsToPdf.rows,
        testData.exportTransactionsToPdf.date
      )

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining('Report generated for'),
              fontSize: 12
            }),
            expect.objectContaining({
              table: expect.objectContaining({
                headerRows: 1,
                body: expect.any(Array)
              })
            })
          ]),
          pageOrientation: 'landscape'
        })
      )
    })

    it('should handle empty transaction data', async () => {
      const headers = testData.exportTransactionsToPdf.headers
      const rows: (string | number)[][] = []
      const date = testData.exportTransactionsToPdf.date

      const result = await exportTransactionsToPdf(headers, rows, date)

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining('Report generated for'),
              fontSize: 12
            }),
            expect.objectContaining({
              table: expect.objectContaining({
                headerRows: 1,
                body: expect.arrayContaining([
                  headers.map((header) => expect.objectContaining({ text: header }))
                ])
              })
            })
          ])
        })
      )
    })

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(pdfMake.createPdf).mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      const result = await exportTransactionsToPdf(
        testData.exportTransactionsToPdf.headers,
        testData.exportTransactionsToPdf.rows,
        testData.exportTransactionsToPdf.date
      )

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
