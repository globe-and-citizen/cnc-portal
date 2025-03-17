import pdfMake from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import type { ReceiptData } from './excelExport'

// Initialize default fonts
pdfMake.fonts = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics:
      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf'
  }
}

interface PdfExportOptions {
  filename: string
}

export const exportToPdf = (data: (string | number)[][], options: PdfExportOptions) => {
  try {
    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          table: {
            headerRows: 1,
            body: data
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
