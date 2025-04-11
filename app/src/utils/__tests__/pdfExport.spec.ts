import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportReceiptToPdf, exportTransactionsToPdf } from '../pdfExport'
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

describe('pdfExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    })
  })
})
