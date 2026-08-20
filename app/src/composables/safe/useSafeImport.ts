import { useMutation } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { getAddress, isAddress, type Address } from 'viem'
import { currentChainId } from '@/constant'
import { config } from '@/wagmi.config'

const SAFE_INSPECTION_ABI = [
  {
    type: 'function',
    name: 'getOwners',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }]
  },
  {
    type: 'function',
    name: 'getThreshold',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'VERSION',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
] as const

export interface ImportedSafeSummary {
  address: Address
  owners: Address[]
  threshold: number
  version: string
}

/**
 * Reads the immutable configuration of an existing Safe on the CNC-configured
 * network. It never sends a transaction or changes Safe state.
 */
export async function inspectSafe(address: string): Promise<ImportedSafeSummary> {
  if (!isAddress(address)) {
    throw new Error('Enter a valid Safe address')
  }

  const safeAddress = getAddress(address)

  try {
    const [owners, threshold, version] = await Promise.all([
      readContract(config, {
        chainId: currentChainId,
        address: safeAddress,
        abi: SAFE_INSPECTION_ABI,
        functionName: 'getOwners'
      }),
      readContract(config, {
        chainId: currentChainId,
        address: safeAddress,
        abi: SAFE_INSPECTION_ABI,
        functionName: 'getThreshold'
      }),
      readContract(config, {
        chainId: currentChainId,
        address: safeAddress,
        abi: SAFE_INSPECTION_ABI,
        functionName: 'VERSION'
      })
    ])

    const ownerAddresses = owners as Address[]
    const ownerThreshold = Number(threshold)

    if (
      !ownerAddresses.length ||
      !Number.isSafeInteger(ownerThreshold) ||
      ownerThreshold < 1 ||
      ownerThreshold > ownerAddresses.length ||
      !version
    ) {
      throw new Error('The Safe configuration is invalid')
    }

    return {
      address: safeAddress,
      owners: ownerAddresses,
      threshold: ownerThreshold,
      version
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'The Safe configuration is invalid') {
      throw error
    }

    throw new Error('No supported Safe was found at this address on the configured network')
  }
}

/** TanStack mutation wrapper for Safe inspection. */
export function useInspectSafe() {
  return useMutation<ImportedSafeSummary, Error, string>({
    mutationKey: ['inspectSafe'],
    mutationFn: inspectSafe
  })
}
