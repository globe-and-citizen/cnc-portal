import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportToPdf, exportReceiptToPdf } from '../pdfExport'
import pdfMake from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

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
      const data = [
        ['Header1', 'Header2'],
        ['Value1', '100']
      ]
      const options = {
        filename: 'test.pdf'
      }

      const result = exportToPdf(data, options, true)

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith({
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [5, 5, 5, 5],
        content: [
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto'],
              body: [
                [
                  {
                    text: 'Header1',
                    fontSize: 6,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: 'Header2',
                    fontSize: 6,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ],
                [
                  {
                    text: 'Value1',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: '100',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'right',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ]
              ]
            }
          }
        ],
        defaultStyle: {
          font: 'Roboto'
        }
      })
      expect(
        pdfMake.createPdf({ content: [] } as TDocumentDefinitions).download
      ).toHaveBeenCalledWith('test.pdf')
    })

    it('should successfully export data to PDF in portrait mode', () => {
      const data = [['Header1', 'Header2']]
      const options = {
        filename: 'test.pdf'
      }

      const result = exportToPdf(data, options, false)

      expect(result).toBe(true)
      expect(pdfMake.createPdf).toHaveBeenCalledWith({
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [5, 5, 5, 5],
        content: [
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto'],
              body: [
                [
                  {
                    text: 'Header1',
                    fontSize: 6,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: 'Header2',
                    fontSize: 6,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ]
              ]
            }
          }
        ],
        defaultStyle: {
          font: 'Roboto'
        }
      })
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

      exportReceiptToPdf(receiptData)

      expect(pdfMake.createPdf).toHaveBeenCalledWith({
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [5, 5, 5, 5],
        content: [
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto'],
              body: [
                [
                  {
                    text: 'Field',
                    fontSize: 6,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: 'Value',
                    fontSize: 6,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ],
                [
                  {
                    text: 'Transaction Hash',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: '0x1234567890abcdef',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'right',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ],
                [
                  {
                    text: 'Date',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: '2024-03-20',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ],
                [
                  {
                    text: 'Type',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: 'Transfer',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ],
                [
                  {
                    text: 'From',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: '0x123',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'right',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ],
                [
                  {
                    text: 'To',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: '0x456',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'right',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ],
                [
                  {
                    text: 'Amount',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: '1.5',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'right',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ],
                [
                  {
                    text: 'Token',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: 'ETH',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ],
                [
                  {
                    text: 'Value (USD)',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'left',
                    noWrap: false,
                    wordBreak: 'break-all'
                  },
                  {
                    text: '100.5',
                    fontSize: 5,
                    margin: [2, 2],
                    alignment: 'right',
                    noWrap: false,
                    wordBreak: 'break-all'
                  }
                ]
              ]
            }
          }
        ],
        defaultStyle: {
          font: 'Roboto'
        }
      })
    })

    // it('should include additional currency amounts in the export', () => {
    //   const receiptData = {
    //     txHash: '0x1234567890abcdef',
    //     date: '2024-03-20',
    //     type: 'Transfer',
    //     from: '0x123',
    //     to: '0x456',
    //     amountUSD: 100.5,
    //     amount: '1.5',
    //     token: 'ETH',
    //     amountEUR: 95.2,
    //     amountGBP: 80.3
    //   }

    //   const result = exportReceiptToPdf(receiptData)

    //   expect(result).toBe(true)
    //   expect(pdfMake.createPdf).toHaveBeenCalledWith({
    //     pageSize: 'A4',
    //     pageOrientation: 'portrait',
    //     pageMargins: [5, 5, 5, 5],
    //     content: [
    //       {
    //         table: {
    //           headerRows: 1,
    //           widths: ['auto', 'auto'],
    //           body: [
    //             [
    //               {
    //                 text: 'Field',
    //                 fontSize: 6,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: 'Value',
    //                 fontSize: 6,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'Transaction Hash',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: '0x1234567890abcdef',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'right',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'Date',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: '2024-03-20',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'Type',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: 'Transfer',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'From',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: '0x123',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'right',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'To',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: '0x456',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'right',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'Amount',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: '1.5',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'right',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'Token',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: 'ETH',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'Value (USD)',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: '100.5',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'right',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'Value (EUR)',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: '95.2',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'right',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ],
    //             [
    //               {
    //                 text: 'Value (GBP)',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'left',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               },
    //               {
    //                 text: '80.3',
    //                 fontSize: 5,
    //                 margin: [2, 2],
    //                 alignment: 'right',
    //                 noWrap: false,
    //                 wordBreak: 'break-all'
    //               }
    //             ]
    //           ]
    //         }
    //       }
    //     ],
    //     defaultStyle: {
    //       font: 'Roboto'
    //     }
    //   })
    // })

    // it('should generate correct filename with truncated txHash', () => {
    //   const receiptData = {
    //     txHash: '0x1234567890abcdef',
    //     date: '2024-03-20',
    //     type: 'Transfer',
    //     from: '0x123',
    //     to: '0x456',
    //     amountUSD: 100.5,
    //     amount: '1.5',
    //     token: 'ETH'
    //   }

    //   exportReceiptToPdf(receiptData)

    //   expect(
    //     pdfMake.createPdf({ content: [] } as TDocumentDefinitions).download
    //   ).toHaveBeenCalledWith('receipt-0x1234.pdf')
    // })
  })

  // describe('exportTransactionsToPdf', () => {
  //   it('should export transactions with correct format', () => {
  //     const headers = ['Date', 'Amount', 'Type']
  //     const rows = [
  //       ['2024-03-20', '1.5', 'Transfer'],
  //       ['2024-03-21', '2.0', 'Swap']
  //     ]
  //     const date = '2024-03-20'

  //     const result = exportTransactionsToPdf(headers, rows, date)

  //     expect(result).toBe(true)
  //     expect(pdfMake.createPdf).toHaveBeenCalledWith({
  //       pageSize: 'A4',
  //       pageOrientation: 'landscape',
  //       pageMargins: [5, 5, 5, 5],
  //       content: [
  //         {
  //           table: {
  //             headerRows: 1,
  //             widths: ['auto', 'auto', 'auto'],
  //             body: [
  //               [
  //                 {
  //                   text: 'Date',
  //                   fontSize: 6,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 },
  //                 {
  //                   text: 'Amount',
  //                   fontSize: 6,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 },
  //                 {
  //                   text: 'Type',
  //                   fontSize: 6,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 }
  //               ],
  //               [
  //                 {
  //                   text: '2024-03-20',
  //                   fontSize: 5,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 },
  //                 {
  //                   text: '1.5',
  //                   fontSize: 5,
  //                   margin: [2, 2],
  //                   alignment: 'right',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 },
  //                 {
  //                   text: 'Transfer',
  //                   fontSize: 5,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 }
  //               ],
  //               [
  //                 {
  //                   text: '2024-03-21',
  //                   fontSize: 5,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 },
  //                 {
  //                   text: '2.0',
  //                   fontSize: 5,
  //                   margin: [2, 2],
  //                   alignment: 'right',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 },
  //                 {
  //                   text: 'Swap',
  //                   fontSize: 5,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 }
  //               ]
  //             ]
  //           }
  //         }
  //       ],
  //       defaultStyle: {
  //         font: 'Roboto'
  //       }
  //     })
  //     expect(
  //       pdfMake.createPdf({ content: [] } as TDocumentDefinitions).download
  //     ).toHaveBeenCalledWith('transactions-2024-03-20.pdf')
  //   })

  //   it('should handle empty transaction data', () => {
  //     const headers = ['Date', 'Amount', 'Type']
  //     const rows: (string | number)[][] = []
  //     const date = '2024-03-20'

  //     const result = exportTransactionsToPdf(headers, rows, date)

  //     expect(result).toBe(true)
  //     expect(pdfMake.createPdf).toHaveBeenCalledWith({
  //       pageSize: 'A4',
  //       pageOrientation: 'landscape',
  //       pageMargins: [5, 5, 5, 5],
  //       content: [
  //         {
  //           table: {
  //             headerRows: 1,
  //             widths: ['auto', 'auto', 'auto'],
  //             body: [
  //               [
  //                 {
  //                   text: 'Date',
  //                   fontSize: 6,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 },
  //                 {
  //                   text: 'Amount',
  //                   fontSize: 6,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 },
  //                 {
  //                   text: 'Type',
  //                   fontSize: 6,
  //                   margin: [2, 2],
  //                   alignment: 'left',
  //                   noWrap: false,
  //                   wordBreak: 'break-all'
  //                 }
  //               ]
  //             ]
  //           }
  //         }
  //       ],
  //       defaultStyle: {
  //         font: 'Roboto'
  //       }
  //     })
  //   })

  //   it('should generate correct filename with date', () => {
  //     const headers = ['Date', 'Amount', 'Type']
  //     const rows = [['2024-03-20', '1.5', 'Transfer']]
  //     const date = '2024-03-20'

  //     exportTransactionsToPdf(headers, rows, date)

  //     expect(
  //       pdfMake.createPdf({ content: [] } as TDocumentDefinitions).download
  //     ).toHaveBeenCalledWith('transactions-2024-03-20.pdf')
  //   })
  // })
})
