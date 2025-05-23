import pdfMake from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions, Content, Column } from 'pdfmake/interfaces'
import type { ReceiptData } from './excelExport'
import logoImage from '../assets/LogoWithoutText.png'

interface PdfExportOptions {
  title: string
  subtitle: string
  filename: string
  isLandscape?: boolean
}

interface ExtendedDocumentDefinition extends TDocumentDefinitions {
  subtitle?: string
  filename: string
}

const FONTS = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics:
      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf'
  }
}

const COLORS = {
  primary: '#2563eb',
  secondary: '#6b7280',
  border: '#e5e7eb',
  headerBg: '#f3f4f6',
  rowBg: '#f9fafb'
}

pdfMake.fonts = FONTS

async function getBase64Image(imgUrl: string): Promise<string> {
  try {
    const response = await fetch(imgUrl)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error loading image:', error)
    return ''
  }
}

const createTableLayout = () => ({
  hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
    i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
  vLineWidth: () => 0,
  hLineColor: (i: number, node: { table: { body: unknown[] } }) =>
    i === 0 || i === 1 || i === node.table.body.length ? COLORS.border : COLORS.headerBg,
  fillColor: (i: number) => (i === 0 ? COLORS.rowBg : null),
  paddingLeft: () => 8,
  paddingRight: () => 8,
  paddingTop: () => 12,
  paddingBottom: () => 12
})

const createHeader = (logoBase64: string, title: string): { columns: Column[] } => ({
  columns: [
    logoBase64
      ? ({
          image: logoBase64,
          width: 50,
          margin: [40, 20, 0, 0]
        } as Column)
      : ({
          text: '',
          width: 50,
          margin: [40, 20, 0, 0]
        } as Column),
    {
      text: title,
      alignment: 'right',
      margin: [0, 20, 40, 0],
      fontSize: 24,
      bold: true,
      color: COLORS.primary
    } as Column
  ]
})

const createFooter = (): { columns: Column[] } => ({
  columns: [
    {
      text: 'Generated by Globe & Citizen',
      alignment: 'left',
      margin: [40, 0],
      fontSize: 8,
      color: COLORS.secondary
    } as Column,
    {
      text: new Date().toLocaleString(),
      alignment: 'right',
      margin: [0, 0, 40, 0],
      fontSize: 8,
      color: COLORS.secondary
    } as Column
  ]
})

const createBaseDocDefinition = async (
  options: PdfExportOptions
): Promise<ExtendedDocumentDefinition> => {
  const logoBase64 = await getBase64Image(logoImage)
  return {
    content: [],
    pageSize: 'A4',
    pageOrientation: options.isLandscape ? 'landscape' : 'portrait',
    pageMargins: [40, 60, 40, 60],
    header: createHeader(logoBase64, options.title),
    footer: createFooter(),
    defaultStyle: { font: 'Roboto' },
    pageBreakBefore: (currentNode, followingNodesOnPage) => {
      if (currentNode.table && followingNodesOnPage.length === 0) {
        return true
      }
      return false
    },
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 10],
        color: COLORS.primary
      }
    },
    subtitle: options.subtitle,
    filename: options.filename
  }
}

export const exportReceiptToPdf = async (receiptData: ReceiptData): Promise<boolean> => {
  try {
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

    const currencyRows = Object.entries(receiptData)
      .filter(([key]) => key.startsWith('amount') && key !== 'amountUSD' && key !== 'amount')
      .map(([key, value]) => [`Value (${key.replace('amount', '')})`, value.toString()])

    const docDefinition = await createBaseDocDefinition({
      title: 'Transaction Receipt',
      subtitle: `Receipt generated on ${new Date().toLocaleDateString()}`,
      filename: `receipt-${receiptData.txHash.slice(0, 6)}.pdf`,
      isLandscape: false
    })

    docDefinition.content = [
      {
        text: docDefinition.subtitle,
        fontSize: 12,
        color: COLORS.secondary,
        margin: [0, 0, 0, 20],
        alignment: 'right'
      } as Content,
      {
        table: {
          headerRows: 1,
          widths: ['30%', '70%'],
          body: [...baseRows, ...currencyRows].map((row, rowIndex) =>
            row.map((cell, cellIndex) => ({
              text: String(cell),
              fontSize: rowIndex === 0 ? 12 : 10,
              bold: rowIndex === 0,
              fillColor: rowIndex === 0 ? COLORS.headerBg : null,
              margin: [cellIndex === 0 ? 10 : 5, 5],
              alignment: cellIndex === 0 ? 'left' : 'left'
            }))
          )
        },
        layout: createTableLayout()
      } as Content
    ]

    pdfMake.createPdf(docDefinition).download(docDefinition.filename)
    return true
  } catch (error) {
    console.error('Error generating receipt PDF:', error)
    return false
  }
}

const TABLE_CONFIG = {
  widths: {
    'tx hash': 130,
    date: 70,
    type: 45,
    from: 110,
    to: 110,
    amount: 50,
    'value (usd)': 60,
    receipt: 50,
    default: 60
  },
  styles: {
    shared: { fontSize: 9, margin: [4, 6, 8, 6] },
    header: { bold: true, fillColor: COLORS.headerBg, margin: [4, 8, 8, 8], fontSize: 10 }
  }
} as const

type ColumnKey = keyof typeof TABLE_CONFIG.widths

const createTableContent = (headers: string[], rows: (string | number)[][]): Content => ({
  table: {
    headerRows: 1,
    keepWithHeaderRows: 1,
    dontBreakRows: true,
    widths: headers.map(
      (h) => TABLE_CONFIG.widths[h.toLowerCase() as ColumnKey] ?? TABLE_CONFIG.widths.default
    ),
    body: [
      headers.map((h) => ({
        ...TABLE_CONFIG.styles.header,
        text: h,
        alignment: getColumnAlignment(h)
      })),
      ...rows.map((row) =>
        row.map((cell, i) => {
          const value = String(cell),
            isUrl = value.startsWith('http')
          return {
            ...TABLE_CONFIG.styles.shared,
            text: isUrl ? 'View' : value,
            alignment: getColumnAlignment(headers[i]),
            ...(isUrl && { color: COLORS.primary, link: value, title: value })
          }
        })
      )
    ]
  },
  layout: {
    ...createTableLayout(),
    fillColor: (i) => (i === 0 ? COLORS.headerBg : i % 2 === 0 ? '#f8fafc' : null),
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
    vLineWidth: () => 0,
    hLineColor: (i, node) =>
      i === 0 || i === node.table.body.length ? COLORS.border : COLORS.headerBg,
    paddingLeft: () => 8,
    paddingRight: () => 12,
    paddingTop: () => 8,
    paddingBottom: () => 8
  }
})

export const exportTransactionsToPdf = async (
  headers: string[],
  rows: (string | number)[][],
  date: string
): Promise<boolean> => {
  try {
    const docDefinition = await createBaseDocDefinition({
      title: 'Transactions Report',
      subtitle: `Report generated for ${date}`,
      filename: `transactions-${date}.pdf`,
      isLandscape: true
    })

    docDefinition.content = [
      {
        text: docDefinition.subtitle,
        fontSize: 12,
        color: COLORS.secondary,
        margin: [0, 0, 0, 20],
        alignment: 'right'
      } as Content,
      createTableContent(headers, rows)
    ]

    pdfMake.createPdf(docDefinition).download(docDefinition.filename)
    return true
  } catch (error) {
    console.error('Error generating transactions PDF:', error)
    return false
  }
}

function getColumnAlignment(header: string): 'left' | 'right' | 'center' {
  if (header.toLowerCase().includes('amount') || header.toLowerCase().includes('value')) {
    return 'right'
  }
  if (header.toLowerCase().includes('date')) {
    return 'center'
  }
  return 'left'
}
export { createTableLayout, createHeader, createFooter, getColumnAlignment }
