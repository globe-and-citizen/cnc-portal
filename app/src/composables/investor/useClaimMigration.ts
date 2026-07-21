import { useMutation } from '@tanstack/vue-query'
import { type Address, type Hex } from 'viem'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'

export interface ClaimArgs {
  investorV2Address: Address
  amount: bigint
  proof: Hex[]
}

/**
 * Claim migrated shares on Investor v2 via Merkle proof.
 * Called after migration root is set and shareholder has their proof.
 */
export async function claimMigration(args: ClaimArgs) {
  const { receipt } = await executeContractWrite({
    address: args.investorV2Address,
    abi: INVESTOR_V2_ABI,
    functionName: 'claim',
    args: [args.amount, args.proof]
  })

  return receipt
}

/**
 * TanStack-wrapped claim. Exposes isPending, error, data for UI binding.
 */
export function useClaimMigrationMutation() {
  return useMutation<any, Error, ClaimArgs>({
    mutationFn: claimMigration
  })
}
