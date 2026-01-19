export interface TradingSession {
  eoaAddress: string
  safeAddress: string
  isSafeDeployed: boolean
  hasApiCredentials: boolean
  hasApprovals: boolean
  apiCredentials?: {
    key: string
    secret: string
    passphrase: string
  }
  lastChecked: number
}

export type SessionStep =
  | 'idle'
  | 'checking'
  | 'deploying'
  | 'credentials'
  | 'approvals'
  | 'complete'

export const loadSession = (address: string): TradingSession | null => {
  const stored = localStorage.getItem(`polymarket_trading_session_${address.toLowerCase()}`)
  if (!stored) return null

  try {
    const session = JSON.parse(stored) as TradingSession

    // Validate session belongs to this address
    if (session.eoaAddress.toLowerCase() !== address.toLowerCase()) {
      console.warn('Session address mismatch, clearing invalid session')
      clearSession(address)
      return null
    }

    return session
  } catch (e) {
    console.error('Failed to parse session:', e)
    return null
  }
}

export const saveSession = (address: string, session: TradingSession): void => {
  // Do not persist sensitive API credentials in clear text.
  // Store a redacted version; credentials will be re-derived when needed.
  const { apiCredentials, ...rest } = session
  const sessionToStore: TradingSession = {
    ...rest,
    // Explicitly drop apiCredentials from persisted storage
    apiCredentials: undefined
  }

  localStorage.setItem(
    `polymarket_trading_session_${address.toLowerCase()}`,
    JSON.stringify(sessionToStore)
  )
}

export const clearSession = (address: string): void => {
  localStorage.removeItem(`polymarket_trading_session_${address.toLowerCase()}`)
}
