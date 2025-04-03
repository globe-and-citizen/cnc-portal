import pdfMake from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import type { ReceiptData } from './excelExport'

// Initialize default fonts

interface PdfExportOptions {
  filename: string
}
pdfMake.fonts = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics:
      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf'
  }
}

export const exportToPdf = (
  data: (string | number)[][],
  options: PdfExportOptions,
  isLandscape = true
) => {
  try {
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: isLandscape ? 'landscape' : 'portrait',
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
      ],
      defaultStyle: {
        font: 'Roboto'
      }
    }

    pdfMake.createPdf(docDefinition).download(options.filename)
    return true
  } catch (error) {
    console.error('Error generating PDF:', error)
    return false
  }
}

export const exportReceiptToPdf = (receiptData: ReceiptData) => {
  const baseRows = [
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

  // Add any additional currency amounts
  const currencyRows = Object.entries(receiptData)
    .filter(([key]) => key.startsWith('amount') && key !== 'amountUSD' && key !== 'amount')
    .map(([key, value]) => {
      const currency = key.replace('amount', '')
      return [`Value (${currency})`, value.toString()]
    })

  return exportToPdf(
    [...baseRows, ...currencyRows],
    {
      filename: `receipt-${receiptData.txHash.slice(0, 6)}.pdf`
    },
    false
  )
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
