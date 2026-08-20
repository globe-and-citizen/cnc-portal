import { useMutation } from '@tanstack/vue-query'
import { type Address, type Hex } from 'viem'
import { investorAbi } from '@/artifacts/abi/generated'
import {
  executeContractWrite,
  type ExecuteContractWriteResult
} from '@/composables/contracts/useContractWritesV3'

export interface ClaimArgs {
  investorAddress: Address
  amount: bigint
  proof: Hex[]
}

/**
 * Claim migrated shares on the Investor contract via Merkle proof.
 * Called after migration root is set and shareholder has their proof.
 */
export async function claimMigration(args: ClaimArgs) {
  const { receipt } = await executeContractWrite({
    address: args.investorAddress,
    abi: investorAbi,
    functionName: 'claim',
    args: [args.amount, args.proof]
  })

  return receipt
}

/**
 * TanStack-wrapped claim. Exposes isPending, error, data for UI binding.
 */
export function useClaimMigrationMutation() {
  return useMutation<ExecuteContractWriteResult['receipt'], Error, ClaimArgs>({
    mutationFn: claimMigration
  })
}
