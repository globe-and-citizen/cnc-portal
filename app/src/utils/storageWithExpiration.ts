const DAY_IN_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export const createLocalStorageWithExpiration = (baseStorage = localStorage) => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setItem: (key: string, value: any) => {
      const now = new Date()
      const item = {
        value: JSON.parse(value),
        expiry: now.getTime() + DAY_IN_MS
      }
      try {
        localStorage.setItem(key, JSON.stringify(item))
      } catch (error) {
        console.error('Error setting item in storage:', error)
      }
    },
    getItem: (key: string) => {
      try {
        const itemStr = baseStorage.getItem(key)
        if (!itemStr) {
          return null
        }
        const item = JSON.parse(itemStr)
        const now = new Date()

        if (now.getTime() > item.expiry) {
          baseStorage.removeItem(key) // Remove expired item
          return null
        }
        console.log(item.value)
        return JSON.stringify(item.value)
      } catch (error) {
        console.error('Error getting item from storage:', error)
        // Optionally remove corrupted item
        // baseStorage.removeItem(key);
        return null
      }
    },
    removeItem: (key: string) => {
      try {
        baseStorage.removeItem(key)
      } catch (error) {
        console.error('Error removing item from storage:', error)
      }
    }
  }
}

export const dailyLocalStorage = createLocalStorageWithExpiration()
