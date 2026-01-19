import { useEthersSigner } from './useEthersSigner'
import { useUserDataStore } from '@/stores'
import { ClobClient } from '@polymarket/clob-client'
import { CLOB_API_URL, POLYGON_CHAIN_ID } from '@/constant/'

export interface UserApiCredentials {
  key: string
  secret: string
  passphrase: string
}

/**
 * Composable to handle deriving or creating User API Credentials.
 */
export function useUserApiCredentials() {
  const { ethersSigner } = useEthersSigner()
  const { address } = useUserDataStore()

  const createOrDeriveUserApiCredentials = async (): Promise<UserApiCredentials> => {
    if (!address || !ethersSigner.value) {
      throw new Error('Wallet not connected')
    }

    // Temporary client used specifically for L1 (signing-based) auth tasks
    const tempClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, ethersSigner.value)

    try {
      // The SDK's built-in convenience method attempts to find existing keys
      // with the default nonce, or creates a new set if none are found.
      const creds = await tempClient.createOrDeriveApiKey()
      return creds
    } catch (err) {
      console.error('Failed to get credentials:', err)
      throw err instanceof Error ? err : new Error('Failed to get credentials')
    }
  }

  return { createOrDeriveUserApiCredentials }
}
