/**
 * Side-effect contract (see app/src/composables/CONVENTIONS.md):
 *   - onSuccess: outcome toast describing which branch fired
 *                ('done' / 'noop-already-migrated' / 'noop-empty').
 *   - onError:   no toast — `mutation.error` is left for callers to render
 *                inline (UAlert).
 *   - Invalidation: invalidates the persisted migration snapshot query for
 *                this team (investorMigrationKeys) on a successful 'done'.
 *                Read-side contract queries live outside this wrapper's
 *                scope — callers refetch what they need separately.
 *   - Options:   pass `silent: true` when composing inside an orchestrator
 *                that emits its own flow-level outcome toast.
 */
import { useMutation } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { zeroHash, type Address, type Hex } from 'viem'
import { config } from '@/wagmi.config'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import {
  useCreateInvestorMigrationMutation,
  useGenerateMerkleSnapshotMutation
} from '@/queries/investorMigration.queries'
import { useToast } from '@nuxt/ui/composables'

export interface Shareholder {
  shareholder: Address
  amount: bigint
}

export interface MigrateShareholdersArgs {
  teamId: string | number
  previousOfficerAddress: Address
  newInvestorAddress: Address
}

export type MigrateShareholdersResult =
  | {
      kind: 'done'
      migratedCount: number
      previousInvestorAddress: Address
      merkleRoot: Hex
      blockNumber: bigint
      shareholders: readonly Shareholder[]
    }
  | { kind: 'noop-empty' }
  | { kind: 'noop-already-migrated' }

const findInvestorV1Address = async (officerAddress: Address): Promise<Address | null> => {
  const contracts = (await readContract(config, {
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'getTeam'
  })) as readonly { contractType: string; contractAddress: Address }[]
  return contracts.find((c) => c.contractType === 'InvestorV1')?.contractAddress ?? null
}

/**
 * Guards before migration:
 *   - old InvestorV1 has 0 shareholders → noop-empty
 *   - new Investor already has a migration root set → noop-already-migrated
 *   - otherwise → proceed to generate & commit
 */
export async function checkMigrationEligibility(
  args: MigrateShareholdersArgs
): Promise<
  { eligible: true } | { eligible: false; reason: 'noop-empty' | 'noop-already-migrated' }
> {
  const oldInvestor = await findInvestorV1Address(args.previousOfficerAddress)
  if (!oldInvestor) {
    throw new Error('Previous Officer has no InvestorV1 sub-contract to migrate from')
  }

  const shareholders = (await readContract(config, {
    address: oldInvestor,
    abi: INVESTOR_ABI,
    functionName: 'getShareholders'
  })) as readonly Shareholder[]

  if (shareholders.length === 0) {
    return { eligible: false, reason: 'noop-empty' }
  }

  const existingRoot = (await readContract(config, {
    address: args.newInvestorAddress,
    abi: INVESTOR_V2_ABI,
    functionName: 'getMigrationRoot'
  })) as Hex

  if (existingRoot !== zeroHash) {
    return { eligible: false, reason: 'noop-already-migrated' }
  }

  return { eligible: true }
}

export interface UseMigrateShareholdersOptions {
  /**
   * When true, suppress the default outcome toast. Set this when composing
   * inside an orchestrator that emits its own flow-level toast covering the
   * full redeploy/migration sequence.
   */
  silent?: boolean
}

/**
 * Orchestrates shareholder migration from v1 to v2:
 *   1. Check eligibility (no previous root, shareholders exist)
 *   2. Generate Merkle snapshot with double hash via backend
 *   3. Write root to new Investor v2 contract
 *   4. Persist snapshot for shareholders' later claim proof fetches
 *
 * Side effects: emits a success toast describing the outcome.
 * Callers typically render errors via `mutation.error` on their own UI.
 */
export function useMigrateShareholders(options: UseMigrateShareholdersOptions = {}) {
  const toast = useToast()
  const generateSnapshotMutation = useGenerateMerkleSnapshotMutation()
  const persistMutation = useCreateInvestorMigrationMutation()

  return useMutation<MigrateShareholdersResult, Error, MigrateShareholdersArgs>({
    mutationKey: ['migrateShareholders'],
    mutationFn: async (args) => {
      const oldInvestor = await findInvestorV1Address(args.previousOfficerAddress)
      if (!oldInvestor) {
        throw new Error('Previous Officer has no InvestorV1 sub-contract to migrate from')
      }

      const eligibility = await checkMigrationEligibility(args)
      if (!eligibility.eligible) {
        return { kind: eligibility.reason }
      }

      // Generate Merkle snapshot with double hash from backend
      const snapshot = await generateSnapshotMutation.mutateAsync({
        body: { investorV1Address: oldInvestor }
      })
      if (!snapshot) {
        throw new Error('Failed to generate Merkle snapshot')
      }

      // Write root to new Investor v2
      await executeContractWrite({
        address: args.newInvestorAddress,
        abi: INVESTOR_V2_ABI,
        functionName: 'setMigrationRoot',
        args: [snapshot.root]
      })

      // Persist snapshot so shareholders can fetch their claim proofs
      await persistMutation.mutateAsync({
        body: {
          teamId: args.teamId,
          previousInvestorAddress: oldInvestor,
          newInvestorAddress: args.newInvestorAddress,
          merkleRoot: snapshot.root,
          blockNumber: snapshot.blockNumber,
          shareholders: snapshot.shareholders.map((s) => ({
            shareholder: s.address as Address,
            amount: s.amount
          }))
        }
      })

      return {
        kind: 'done',
        migratedCount: snapshot.shareholders.length,
        previousInvestorAddress: oldInvestor,
        merkleRoot: snapshot.root as Hex,
        blockNumber: BigInt(snapshot.blockNumber),
        shareholders: snapshot.shareholders.map((s) => ({
          shareholder: s.address as Address,
          amount: BigInt(s.amount)
        }))
      }
    },
    onSuccess: (result) => {
      if (options.silent) return
      if (result.kind === 'done') {
        toast.add({
          title: `Migration root set for ${result.migratedCount} shareholder${result.migratedCount === 1 ? '' : 's'}`,
          color: 'success'
        })
      } else if (result.kind === 'noop-already-migrated') {
        toast.add({ title: 'Shareholders were already migrated', color: 'success' })
      } else if (result.kind === 'noop-empty') {
        toast.add({ title: 'No shareholders to migrate', color: 'info' })
      }
    }
  })
}
