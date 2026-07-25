/**
 * Write-only composable: set migration root on Investor v2 contract.
 * Backend snapshot generation is handled by useGenerateMerkleSnapshotMutation (in queries).
 *
 * Separation of concerns:
 *   - Queries (investorMigration.queries.ts): backend API calls
 *   - This composable: contract writes only
 *
 * Side-effect contract:
 *   - onSuccess: outcome toast (unless options.silent)
 *   - onError: no toast — error left for caller to render
 */
import { useMutation } from '@tanstack/vue-query'
import { type Address, type Hex } from 'viem'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import { useToast } from '@nuxt/ui/composables'

export interface SetMigrationRootArgs {
  investorV2Address: Address
  root: Hex
  shareholderCount: number
}

export interface SetMigrationRootResult {
  root: Hex
  shareholderCount: number
}

/**
 * Set migration root on Investor v2 contract.
 * Caller must generate snapshot separately via useGenerateMerkleSnapshotMutation.
 */
export async function setMigrationRoot(
  args: SetMigrationRootArgs
): Promise<SetMigrationRootResult> {
  await executeContractWrite({
    address: args.investorV2Address,
    abi: INVESTOR_V2_ABI,
    functionName: 'setMigrationRoot',
    args: [args.root]
  })

  return {
    root: args.root,
    shareholderCount: args.shareholderCount
  }
}

/**
 * TanStack-wrapped variant. Use in components for isPending/error state.
 */
export function useSetMigrationRootMutation(options: { silent?: boolean } = {}) {
  const toast = useToast()

  return useMutation<SetMigrationRootResult, Error, SetMigrationRootArgs>({
    mutationFn: setMigrationRoot,
    onSuccess: (result) => {
      if (!options.silent) {
        toast.add({
          title: `Migration root set for ${result.shareholderCount} shareholder${result.shareholderCount === 1 ? '' : 's'}`,
          color: 'success'
        })
      }
    }
  })
}
