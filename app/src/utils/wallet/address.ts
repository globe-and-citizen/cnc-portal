import type { Address } from 'viem'

interface WalletConnectionLike {
  isConnected: { value: boolean }
  address: { value: string | null | undefined }
}

export const getConnectedSigner = (connection: WalletConnectionLike): Address => {
  const signer = connection.address.value

  if (!connection.isConnected.value || !signer) {
    throw new Error('Wallet not connected')
  }

  return signer as Address
}
