const isDevelopment = import.meta.env.MODE === 'development'
// const isVerbose = true

export const getTimestamp = (): string => {
  const now = new Date()
  return `${now.toISOString()}`
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

/**
 * Creates an independent copy of the object so
 * as to avoid creating references to the original
 * object when you want to assign to its value
 * 
 * @param obj - Any object
 * @returns - The cloned object
 */
export const deepClone = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  const clonedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (/*obj.hasOwnProperty(key)*/Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone((obj as { [key: string]: any })[key]);
    }
  }

  return clonedObj
}