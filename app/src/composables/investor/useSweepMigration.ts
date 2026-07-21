import { useMutation } from '@tanstack/vue-query'
import { type Address } from 'viem'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'

export interface SweepArgs {
  investorV2Address: Address
  holders: Address[]
  amounts: bigint[]
}

/**
 * Bulk claim unclaimed shares (owner sweep).
 * Called after migration to ensure all shareholders are minted,
 * even those who haven't claimed yet.
 */
export async function sweepMigration(args: SweepArgs) {
  const { receipt } = await executeContractWrite({
    address: args.investorV2Address,
    abi: INVESTOR_V2_ABI,
    functionName: 'bulkClaim',
    args: [args.holders, args.amounts]
  })

  return receipt
}

/**
 * TanStack-wrapped sweep. Exposes isPending, error, data for UI binding.
 */
export function useSweepMigrationMutation() {
  return useMutation<any, Error, SweepArgs>({
    mutationFn: sweepMigration
  })
}
