import pdfMake from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import type { ReceiptData } from './excelExport'

// Initialize default fonts

interface PdfExportOptions {
  filename: string
}

export const exportToPdf = (data: (string | number)[][], options: PdfExportOptions) => {
  try {
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [5, 5, 5, 5], // Reduce page margins
      content: [
        {
          table: {
            headerRows: 1,
            widths: Array(data[0].length).fill('auto'),
            body: data.map((row, rowIndex) =>
              row.map((cell) => ({
                text: String(cell),
                fontSize: rowIndex === 0 ? 6 : 5, // Smaller font size, headers slightly larger
                margin: [2, 2], // Minimal cell padding
                alignment: !isNaN(Number(cell)) ? 'right' : 'left', // Right-align numbers
                noWrap: false,
                wordBreak: 'break-all'
              }))
            )
          }
        }
      ]
    }

    pdfMake.createPdf(docDefinition).download(options.filename)
    return true
  } catch (error) {
    console.error('Error generating PDF:', error)
    return false
  }
}

export const exportReceiptToPdf = (receiptData: ReceiptData) => {
  const rows = [
    ['Field', 'Value'],
    ['Transaction Hash', receiptData.txHash],
    ['Date', receiptData.date],
    ['Type', receiptData.type],
    ['From', receiptData.from],
    ['To', receiptData.to],
    ['Amount', receiptData.amount],
    ['Token', receiptData.token],
    ['Value (USD)', receiptData.amountUSD.toString()]
  ]

  return exportToPdf(rows, {
    filename: `receipt-${receiptData.txHash.slice(0, 6)}.pdf`
  })
}

export const exportTransactionsToPdf = (
  headers: string[],
  rows: (string | number)[][],
  date: string
) => {
  return exportToPdf([headers, ...rows], {
    filename: `transactions-${date}.pdf`
  })
}
