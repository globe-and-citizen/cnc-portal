import { useMutation } from '@tanstack/vue-query'
import { type Address, type Hex } from 'viem'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'
import {
  executeContractWrite,
  type ExecuteContractWriteResult
} from '@/composables/contracts/useContractWritesV3'

export interface SweepArgs {
  investorV2Address: Address
  holders: Address[]
  amounts: bigint[]
  proofs: Hex[][]
}

/**
 * Bulk claim migrated shares for the shareholder list.
 * Already-claimed shareholders are skipped by the contract.
 */
export async function sweepMigration(args: SweepArgs) {
  const { receipt } = await executeContractWrite({
    address: args.investorV2Address,
    abi: INVESTOR_V2_ABI,
    functionName: 'bulkClaim',
    args: [args.holders, args.amounts, args.proofs]
  })

  return receipt
}

/**
 * Close the migration after the owner has dispatched the remaining claims.
 * Once closed, no further shareholder claim is accepted by the contract.
 */
export async function completeMigration(investorV2Address: Address) {
  const { receipt } = await executeContractWrite({
    address: investorV2Address,
    abi: INVESTOR_V2_ABI,
    functionName: 'completeMigration',
    args: []
  })

  return receipt
}

/**
 * TanStack-wrapped sweep. Exposes isPending, error, data for UI binding.
 */
export function useSweepMigrationMutation() {
  return useMutation<ExecuteContractWriteResult['receipt'], Error, SweepArgs>({
    mutationFn: sweepMigration
  })
}

/** TanStack-wrapped migration completion for the owner. */
export function useCompleteMigrationMutation() {
  return useMutation<ExecuteContractWriteResult['receipt'], Error, Address>({
    mutationFn: completeMigration
  })
}
