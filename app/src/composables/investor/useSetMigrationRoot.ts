/**
 * Set migration root from backend-generated Merkle snapshot.
 * Backend handles double-hash computation; frontend just commits the root on-chain.
 *
 * Side-effect contract:
 *   - onSuccess: outcome toast
 *   - onError: no toast — error left for caller to render
 */
import { useMutation } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { type Address, zeroHash, type Hex } from 'viem'
import { config } from '@/wagmi.config'
import { useApi } from '@/composables/api'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import { useToast } from '@nuxt/ui/composables'

export interface SetMigrationRootArgs {
  teamId: string | number
  previousOfficerAddress: Address
  newInvestorAddress: Address
}

export interface SetMigrationRootResult {
  root: Hex
  shareholderCount: number
}

const findInvestorV1Address = async (officerAddress: Address): Promise<Address | null> => {
  const contracts = (await readContract(config, {
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'getTeam'
  })) as readonly { contractType: string; contractAddress: Address }[]
  return contracts.find((c) => c.contractType === 'InvestorV1')?.contractAddress ?? null
}

/**
 * Set migration root from backend Merkle snapshot.
 * Backend generates the tree with correct double hash; frontend commits root on-chain.
 */
export async function setMigrationRoot(
  args: SetMigrationRootArgs
): Promise<SetMigrationRootResult> {
  const { apiFetch } = useApi()

  // Find old Investor address
  const oldInvestor = await findInvestorV1Address(args.previousOfficerAddress)
  if (!oldInvestor) {
    throw new Error('Previous Officer has no InvestorV1 sub-contract')
  }

  // Check if already migrated
  const existingRoot = (await readContract(config, {
    address: args.newInvestorAddress,
    abi: INVESTOR_V2_ABI,
    functionName: 'getMigrationRoot'
  })) as Hex

  if (existingRoot !== zeroHash) {
    throw new Error('This Investor already has a migration root set')
  }

  // Generate Merkle snapshot from backend (with correct double hash)
  const response = await apiFetch(`/investor-migration/generate`, {
    method: 'POST',
    body: JSON.stringify({ investorV1Address: oldInvestor })
  })

  if (!response.ok) {
    throw new Error(`Failed to generate Merkle snapshot: ${response.statusText}`)
  }

  const snapshot = await response.json()

  if (snapshot.shareholders.length === 0) {
    throw new Error('No shareholders to migrate')
  }

  // Commit root on-chain
  await executeContractWrite({
    address: args.newInvestorAddress,
    abi: INVESTOR_V2_ABI,
    functionName: 'setMigrationRoot',
    args: [snapshot.root]
  })

  return {
    root: snapshot.root,
    shareholderCount: snapshot.shareholders.length
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
