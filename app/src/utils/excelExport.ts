// import xlsx from 'node-xlsx'

interface ExcelExportOptions {
  filename: string
  sheetName?: string
}

export interface ReceiptData {
  txHash: string
  date: string
  type: string
  from: string
  to: string
  amountUSD: number
  amount: string
  token: string
  [key: string]: string | number // Allow for dynamic currency amounts
}

type ExcelData = (string | number)[][]

export const exportToExcel = (data: ExcelData, options: ExcelExportOptions) => {
  try {
    // Create worksheet
    // const worksheet = {
    //   name: options.sheetName || 'Sheet1',
    //   data,
    //   options: {}
    // }

    // Create buffer
    // const buffer = xlsx.build([worksheet])

    // Create blob and download
    const blob = new Blob([], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = options.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    return true
  } catch (error) {
    console.error('Error generating Excel:', error)
    return false
  }
}

export const exportReceiptToExcel = (receiptData: ReceiptData) => {
  const headers = ['Field', 'Value']
  const baseRows = [
    ['Transaction Hash', receiptData.txHash],
    ['Date', receiptData.date],
    ['Type', receiptData.type],
    ['From', receiptData.from],
    ['To', receiptData.to],
    ['Amount', receiptData.amount],
    ['Token', receiptData.token],
    ['Value (USD)', receiptData.amountUSD]
  ]

  // Add any additional currency amounts
  const currencyRows = Object.entries(receiptData)
    .filter(([key]) => key.startsWith('amount') && key !== 'amountUSD' && key !== 'amount')
    .map(([key, value]) => {
      const currency = key.replace('amount', '')
      return [`Value (${currency})`, value]
    })

  return exportToExcel([headers, ...baseRows, ...currencyRows], {
    filename: `receipt-${receiptData.txHash.slice(0, 6)}.xlsx`,
    sheetName: 'Receipt'
  })
}

export const exportTransactionsToExcel = (headers: string[], rows: ExcelData, date: string) => {
  return exportToExcel([headers, ...rows], {
    filename: `transactions-${date}.xlsx`,
    sheetName: 'Transactions'
  })
}
