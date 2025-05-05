import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportToExcel, exportReceiptToExcel, exportTransactionsToExcel } from '../excelExport'
import xlsx from 'node-xlsx'

// Mock node-xlsx
vi.mock('node-xlsx', () => ({
  default: {
    build: vi.fn().mockReturnValue(Buffer.from('mock-excel-data'))
  }
}))

// Mock browser APIs
const mockCreateObjectURL = vi.fn().mockReturnValue('mock-url')
const mockRevokeObjectURL = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockClick = vi.fn()
const mockBlob = vi.fn()

global.Blob = mockBlob

global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

describe('excelExport', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Mock document.createElement and related methods
    const mockLink = {
      href: '',
      download: '',
      click: mockClick
    }
    document.createElement = vi.fn().mockReturnValue(mockLink)
    document.body.appendChild = mockAppendChild
    document.body.removeChild = mockRemoveChild
  })

  describe('exportToExcel', () => {
    it('should successfully export data to Excel', () => {
      const data = [
        ['Header1', 'Header2'],
        ['Value1', 'Value2']
      ]
      const options = {
        filename: 'test.xlsx',
        sheetName: 'TestSheet'
      }

      const result = exportToExcel(data, options)

      expect(result).toBe(true)
      expect(xlsx.build).toHaveBeenCalledWith([
        {
          name: 'TestSheet',
          data,
          options: {}
        }
      ])
      expect(mockBlob).toHaveBeenCalledWith([Buffer.from('mock-excel-data')], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('should use default sheet name when not provided', () => {
      const data = [['Header1', 'Header2']]
      const options = {
        filename: 'test.xlsx'
      }

      exportToExcel(data, options)

      expect(xlsx.build).toHaveBeenCalledWith([
        {
          name: 'Sheet1',
          data,
          options: {}
        }
      ])
    })

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(xlsx.build).mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      const result = exportToExcel([], { filename: 'test.xlsx' })

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should properly set the download filename', () => {
      const data = [['Header1']]
      const options = {
        filename: 'custom-filename.xlsx'
      }

      exportToExcel(data, options)

      const mockLink = document.createElement('a')
      expect(mockLink.download).toBe('custom-filename.xlsx')
    })
  })

  describe('exportReceiptToExcel', () => {
    it('should export receipt data with correct format', () => {
      const receiptData = {
        txHash: '0x1234567890abcdef',
        date: '2024-03-20',
        type: 'Transfer',
        from: '0x123',
        to: '0x456',
        amountUSD: 100.5,
        amount: '1.5',
        token: 'ETH'
      }

      const result = exportReceiptToExcel(receiptData)

      expect(result).toBe(true)
      expect(xlsx.build).toHaveBeenCalledWith([
        {
          name: 'Receipt',
          data: [
            ['Field', 'Value'],
            ['Transaction Hash', receiptData.txHash],
            ['Date', receiptData.date],
            ['Type', receiptData.type],
            ['From', receiptData.from],
            ['To', receiptData.to],
            ['Amount', receiptData.amount],
            ['Token', receiptData.token],
            ['Value (USD)', receiptData.amountUSD]
          ],
          options: {}
        }
      ])
    })

    it('should include additional currency amounts in the export', () => {
      const receiptData = {
        txHash: '0x1234567890abcdef',
        date: '2024-03-20',
        type: 'Transfer',
        from: '0x123',
        to: '0x456',
        amountUSD: 100.5,
        amount: '1.5',
        token: 'ETH',
        amountEUR: 95.2,
        amountGBP: 80.3
      }

      const result = exportReceiptToExcel(receiptData)

      expect(result).toBe(true)
      expect(xlsx.build).toHaveBeenCalledWith([
        {
          name: 'Receipt',
          data: [
            ['Field', 'Value'],
            ['Transaction Hash', receiptData.txHash],
            ['Date', receiptData.date],
            ['Type', receiptData.type],
            ['From', receiptData.from],
            ['To', receiptData.to],
            ['Amount', receiptData.amount],
            ['Token', receiptData.token],
            ['Value (USD)', receiptData.amountUSD],
            ['Value (EUR)', receiptData.amountEUR],
            ['Value (GBP)', receiptData.amountGBP]
          ],
          options: {}
        }
      ])
    })

    it('should generate correct filename with truncated txHash', () => {
      const receiptData = {
        txHash: '0x1234567890abcdef',
        date: '2024-03-20',
        type: 'Transfer',
        from: '0x123',
        to: '0x456',
        amountUSD: 100.5,
        amount: '1.5',
        token: 'ETH'
      }

      exportReceiptToExcel(receiptData)

      const mockLink = document.createElement('a')
      expect(mockLink.download).toBe('receipt-0x1234.xlsx')
    })
  })

  describe('exportTransactionsToExcel', () => {
    it('should export transactions with correct format', () => {
      const headers = ['Date', 'Amount', 'Type']
      const rows = [
        ['2024-03-20', '1.5', 'Transfer'],
        ['2024-03-21', '2.0', 'Swap']
      ]
      const date = '2024-03-20'

      const result = exportTransactionsToExcel(headers, rows, date)

      expect(result).toBe(true)
      expect(xlsx.build).toHaveBeenCalledWith([
        {
          name: 'Transactions',
          data: [headers, ...rows],
          options: {}
        }
      ])
    })

    it('should handle empty transaction data', () => {
      const headers = ['Date', 'Amount', 'Type']
      const rows: (string | number)[][] = []
      const date = '2024-03-20'

      const result = exportTransactionsToExcel(headers, rows, date)

      expect(result).toBe(true)
      expect(xlsx.build).toHaveBeenCalledWith([
        {
          name: 'Transactions',
          data: [headers],
          options: {}
        }
      ])
    })

    it('should generate correct filename with date', () => {
      const headers = ['Date', 'Amount', 'Type']
      const rows = [['2024-03-20', '1.5', 'Transfer']]
      const date = '2024-03-20'

      exportTransactionsToExcel(headers, rows, date)

      const mockLink = document.createElement('a')
      expect(mockLink.download).toBe('transactions-2024-03-20.xlsx')
    })
  })
})
