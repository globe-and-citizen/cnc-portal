const isDevelopment = import.meta.env.MODE === 'development'
// const isVerbose = true

export const getTimestamp = (): string => {
  const now = new Date()
  return `${now.toISOString()}`
}

export const log = {
  info: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.log(`[${getTimestamp()}] INFO: ${message}`, ...args)
      // if (isVerbose) console.trace('Trace:' )
    }
  },
  warn: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.warn(`[${getTimestamp()}] WARN: ${message}`, ...args)
    }
  },
  error: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.error(`[${getTimestamp()}] ERROR: ${message}`, ...args)
    }
  },
  debug: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.debug(`[${getTimestamp()}] DEBUG: ${message}`, ...args)
    }
  }
}
