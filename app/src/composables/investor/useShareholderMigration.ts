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
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import { zeroHash, type Address, type Hex } from 'viem'
import { config } from '@/wagmi.config'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { INVESTOR_V2_ABI } from '@/artifacts/abi/investorV2'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import { useCreateInvestorMigrationMutation } from '@/queries/investorMigration.queries'

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
 * Builds a Merkle root over the previous Officer's InvestorV1 cap table and
 * commits it on the new Investor (v2) via `setMigrationRoot` — shareholders
 * self-claim their balance later (Share Token page), they are not re-minted
 * here. Call directly for raw control, or use `useMigrateShareholders` for
 * TanStack-managed loading/error state plus backend persistence of the
 * snapshot (needed so a shareholder can later fetch their claim proof).
 *
 * Guards:
 *   - old InvestorV1 has 0 shareholders → noop-empty
 *   - new Investor already has a migration root set → noop-already-migrated
 *   - otherwise → builds the tree and calls setMigrationRoot
 */
export async function migrateShareholders(
  args: MigrateShareholdersArgs
): Promise<MigrateShareholdersResult> {
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
    return { kind: 'noop-empty' }
  }

  const existingRoot = (await readContract(config, {
    address: args.newInvestorAddress,
    abi: INVESTOR_V2_ABI,
    functionName: 'getMigrationRoot'
  })) as Hex

  if (existingRoot !== zeroHash) {
    return { kind: 'noop-already-migrated' }
  }

  const tree = StandardMerkleTree.of(
    shareholders.map((s) => [s.shareholder, s.amount]),
    ['address', 'uint256']
  )

  const { receipt } = await executeContractWrite({
    address: args.newInvestorAddress,
    abi: INVESTOR_V2_ABI,
    functionName: 'setMigrationRoot',
    args: [tree.root]
  })

  return {
    kind: 'done',
    migratedCount: shareholders.length,
    previousInvestorAddress: oldInvestor,
    merkleRoot: tree.root as Hex,
    blockNumber: receipt.blockNumber,
    shareholders
  }
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
 * TanStack-wrapped variant of {@link migrateShareholders}. Prefer this in
 * components: it exposes `mutateAsync`, `isPending`, `error`, `data` without
 * any manual ref juggling. On a successful 'done', also persists the frozen
 * shareholder list to the backend (see `investorMigration.queries.ts`) so
 * shareholders can later fetch their claim proof — Ponder cannot reconstruct
 * this after the fact since it never indexed InvestorV1 Transfer events.
 *
 * Side effects: emits a success toast describing the outcome (done / noop).
 * Error toasts are intentionally left to the caller because the right
 * message depends on where the migration was triggered from (inline retry,
 * standalone banner, orchestrated redeploy). Callers typically surface the
 * error via `mutation.error` on their own UI instead.
 */
export function useMigrateShareholders(options: UseMigrateShareholdersOptions = {}) {
  const toast = useToast()
  const persistMutation = useCreateInvestorMigrationMutation()

  return useMutation<MigrateShareholdersResult, Error, MigrateShareholdersArgs>({
    mutationKey: ['migrateShareholders'],
    mutationFn: async (args) => {
      const result = await migrateShareholders(args)

      if (result.kind === 'done') {
        await persistMutation.mutateAsync({
          body: {
            teamId: args.teamId,
            previousInvestorAddress: result.previousInvestorAddress,
            newInvestorAddress: args.newInvestorAddress,
            merkleRoot: result.merkleRoot,
            blockNumber: Number(result.blockNumber),
            shareholders: result.shareholders.map((s) => ({
              shareholder: s.shareholder,
              amount: s.amount.toString()
            }))
          }
        })
      }

      return result
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
