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
 * Bulk claim unclaimed shares and close the migration (owner sweep).
 * Already-claimed shareholders are skipped by the contract.
 */
export async function sweepMigration(args: SweepArgs) {
  const { receipt } = await executeContractWrite({
    address: args.investorV2Address,
    abi: INVESTOR_V2_ABI,
    functionName: 'bulkClaim',
    args: [args.holders, args.amounts, args.proofs]
  })

  const { receipt: completionReceipt } = await executeContractWrite({
    address: args.investorV2Address,
    abi: INVESTOR_V2_ABI,
    functionName: 'completeMigration',
    args: []
  })

  return { receipt, completionReceipt }
}

/**
 * TanStack-wrapped sweep. Exposes isPending, error, data for UI binding.
 */
export function useSweepMigrationMutation() {
  return useMutation<
    {
      receipt: ExecuteContractWriteResult['receipt']
      completionReceipt: ExecuteContractWriteResult['receipt']
    },
    Error,
    SweepArgs
  >({
    mutationFn: sweepMigration
  })
}
