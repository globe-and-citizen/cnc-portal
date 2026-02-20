export * from './errorUtil'
export * from './generalUtil'
export * from './constantUtil'
export * from './currencyUtil'
export * from './expenseUtil'
export * from './contractManagementUtil'
export * from './web3Util'
export * from './safe'
export * from './fileUtil'
/**
 * Utility function to wait for a condition to be met
 * @description This function repeatedly checks a condition until it returns true or a timeout occurs.
 * @param condition () => boolean - A function that returns a boolean indicating whether the condition is met.
 * @param timeout
 */
export const waitForCondition = (condition: () => boolean, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      console.log('Checking condition...')
      if (condition()) {
        clearInterval(interval)
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval)
        reject(new Error('Condition not met within timeout'))
      }
    }, 1000)
  })
}

// Helper function to safely serialize data containing BigInt values
export const formatDataForDisplay = (data: unknown): string => {
  if (data === null || data === undefined) {
    return 'null'
  }

  try {
    return JSON.parse(
      JSON.stringify(
        data,
        (key, value) => {
          if (typeof value === 'bigint') {
            return value.toString()
          }
          return value
        },
        2
      )
    )
  } catch (error) {
    console.warn('Error formatting data for display:', error)
    return String(data)
  }
}

/**
 * Filters a list of items based on a search query for name and address.
 * @param tableau - The list of items to filter, each item should have a name, address, and optionally a type.
 * @param search - An object containing the search query for name and address.
 * @returns A filtered list of items that match the search criteria.
 */

interface TableItem {
  name?: string
  address: string
  type?: string
}
export const filter = (tableau: TableItem[], search: { name: string; address: string }) => {
  return tableau.filter((item) => {
    const nameMatch = item.name?.toLowerCase().includes(search.name.toLowerCase().trim())
    const typeMatch = item.type?.toLowerCase().includes(search.name.toLowerCase().trim())
    const addressMatch = item.address.toLowerCase().includes(search.address.toLowerCase().trim())
    return (nameMatch && addressMatch) || (typeMatch && addressMatch)
  })
}
