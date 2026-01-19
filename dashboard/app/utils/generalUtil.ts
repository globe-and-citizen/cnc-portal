const isDevelopment = import.meta.env.MODE === 'development'
// const isVerbose = true

export const getTimestamp = (): string => {
  const now = new Date()
  return `${now.toLocaleString()}`
}

export const log = {
  info: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(`[${getTimestamp()}] INFO: ${message}`, ...args)
      // if (isVerbose) console.trace('Trace:' )
    }
  },
  warn: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn(`[${getTimestamp()}] WARN: ${message}`, ...args)
    }
  },
  error: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.error(`[${getTimestamp()}] ERROR: ${message}`, ...args)
    }
  },
  debug: (message: string, ...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(`[${getTimestamp()}] DEBUG: ${message}`, ...args)
    }
  }
}

export const shortenAddress = (address: string | undefined) => {
  if (!address) return ''
  return address.slice(0, 6) + '...' + address.slice(-4)
}

/**
 * Convert a snake_case feature name to Title Case format
 * Example: "SUBMIT_RESTRICTION" → "Submit Restriction"
 */
export const formatFeatureName = (featureName: string | undefined): string => {
  if (!featureName) return 'Feature'
  return featureName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
