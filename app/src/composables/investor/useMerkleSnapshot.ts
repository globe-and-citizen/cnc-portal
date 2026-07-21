import { useMutation, useQuery } from '@tanstack/vue-query'
import { type Address, type Hex } from 'viem'
import { useApi } from '@/composables/api'

export interface Shareholder {
  address: string
  amount: string
}

export interface MerkleSnapshot {
  root: Hex
  shareholders: Shareholder[]
  proofs: Record<string, Hex[]>
  blockNumber: number
  totalSupply: string
}

/**
 * Fetch Merkle snapshot + proofs from backend.
 * Backend generates double-hashed tree matching Investor.sol line 464.
 */
export function useMerkleSnapshot(investorV1Address: Address | undefined) {
  const { apiFetch } = useApi()

  return useQuery<MerkleSnapshot | null>({
    queryKey: ['merkleSnapshot', investorV1Address],
    queryFn: async () => {
      if (!investorV1Address) return null

      const response = await apiFetch(`/investor-migration/generate`, {
        method: 'POST',
        body: JSON.stringify({
          investorV1Address
        })
      })

      if (!response.ok) {
        throw new Error(
          `Failed to generate Merkle snapshot: ${response.status} ${response.statusText}`
        )
      }

      return response.json()
    },
    enabled: !!investorV1Address,
    staleTime: 1000 * 60 * 60 // 1 hour
  })
}

/**
 * Generate Merkle snapshot (fire-and-forget mutation for triggering snapshot generation).
 * On success, invalidates related queries so UI refetches.
 */
export function useGenerateMerkleSnapshotMutation() {
  const { apiFetch } = useApi()

  return useMutation<MerkleSnapshot, Error, { investorV1Address: Address }>({
    mutationFn: async ({ investorV1Address }) => {
      const response = await apiFetch(`/investor-migration/generate`, {
        method: 'POST',
        body: JSON.stringify({
          investorV1Address
        })
      })

      if (!response.ok) {
        throw new Error(
          `Failed to generate Merkle snapshot: ${response.status} ${response.statusText}`
        )
      }

      return response.json()
    }
  })
}
