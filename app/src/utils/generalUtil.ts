const isDevelopment = import.meta.env.MODE === 'development'

export const getTimestamp = (): string => {
  const now = new Date()
  return `${now.toISOString()}`
}

export const log = {
  info: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.info(`[${getTimestamp()}] INFO: ${message}`, ...args)
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
