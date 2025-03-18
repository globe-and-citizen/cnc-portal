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
  })
})
