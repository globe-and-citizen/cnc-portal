import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportToPdf, exportReceiptToPdf, exportTransactionsToPdf } from '../pdfExport'
import pdfMake from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
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

describe('pdfExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportToPdf', () => {
    it('should successfully export data to PDF in landscape mode', () => {
      const options = {
        filename: 'test.pdf'
      }

      const result = exportToPdf(testData.exportToPdf.landscapeData, options, true)

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith(testData.exportToPdf.expectedContent.landscape)
      expect(
        pdfMake.createPdf({ content: [] } as TDocumentDefinitions).download
      ).toHaveBeenCalledWith(testData.exportToPdf.expectedFilenames.landscape)
    })

    it('should successfully export data to PDF in portrait mode', () => {
      const options = {
        filename: 'test.pdf'
      }

      const result = exportToPdf(testData.exportToPdf.portraitData, options, false)

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith(testData.exportToPdf.expectedContent.portrait)
      expect(
        pdfMake.createPdf({ content: [] } as TDocumentDefinitions).download
      ).toHaveBeenCalledWith(testData.exportToPdf.expectedFilenames.portrait)
    })

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(pdfMake.createPdf).mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      const result = exportToPdf([], { filename: 'test.pdf' })

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle empty data arrays', () => {
      const data: (string | number)[][] = []
      const options = {
        filename: 'empty.pdf'
      }

      const result = exportToPdf(data, options)

      expect(result).toBe(false)
    })
  })

  describe('exportReceiptToPdf', () => {
    it('should export receipt data with correct format', () => {
      exportReceiptToPdf(testData.exportReceiptToPdf.basicReceipt)

      expect(pdfMake.createPdf).toHaveBeenCalledWith(
        testData.exportReceiptToPdf.expectedContent.basic
      )
    })

    it('should include additional currency amounts in the export', () => {
      exportReceiptToPdf(testData.exportReceiptToPdf.multiCurrencyReceipt)

      expect(pdfMake.createPdf).toHaveBeenCalledWith(
        testData.exportReceiptToPdf.expectedContent.multiCurrency
      )
    })
  })

  describe('exportTransactionsToPdf', () => {
    it('should export transactions with correct format', () => {
      const result = exportTransactionsToPdf(
        testData.exportTransactionsToPdf.headers,
        testData.exportTransactionsToPdf.rows,
        testData.exportTransactionsToPdf.date
      )

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith(
        testData.exportTransactionsToPdf.expectedContent
      )
      expect(
        pdfMake.createPdf({ content: [] } as TDocumentDefinitions).download
      ).toHaveBeenCalledWith(testData.exportTransactionsToPdf.expectedFilenames.transactions)
    })

    it('should handle empty transaction data', () => {
      const headers = testData.exportTransactionsToPdf.headers
      const rows: (string | number)[][] = []
      const date = testData.exportTransactionsToPdf.date

      const result = exportTransactionsToPdf(headers, rows, date)

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith({
        ...testData.exportTransactionsToPdf.expectedContent,
        content: [
          {
            table: {
              ...testData.exportTransactionsToPdf.expectedContent.content[0].table,
              body: [testData.exportTransactionsToPdf.expectedContent.content[0].table.body[0]]
            }
          }
        ]
      })
    })
  })
})
