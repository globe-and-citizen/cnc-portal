import { useMutation } from '@tanstack/vue-query'
import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { OFFICER_ABI } from '@/artifacts/abi/officer'

export interface Shareholder {
  shareholder: Address
  amount: bigint
}

export interface MigrateShareholdersArgs {
  previousOfficerAddress: Address
  newInvestorAddress: Address
}

export type MigrateShareholdersResult =
  | { kind: 'done'; migratedCount: number; shareholders: readonly Shareholder[] }
  | { kind: 'noop-empty' }
  | { kind: 'noop-already-migrated'; matchedCount: number }

/**
 * Thrown by `migrateShareholders` when the new InvestorV1 already holds a
 * non-zero totalSupply that does not match the sum of the old shareholders.
 * Retrying in this state would double-mint, so the function refuses to act.
 */
export class InconsistentSupplyError extends Error {
  readonly newSupply: bigint
  readonly expectedSupply: bigint
  constructor(newSupply: bigint, expectedSupply: bigint) {
    super(
      `New InvestorV1 totalSupply=${newSupply} does not match expected sum of previous shareholders=${expectedSupply}. Migration blocked to prevent double-minting.`
    )
    this.name = 'InconsistentSupplyError'
    this.newSupply = newSupply
    this.expectedSupply = expectedSupply
  }
}

const findInvestorAddress = async (officerAddress: Address): Promise<Address | null> => {
  const contracts = (await readContract(config, {
    address: officerAddress,
    abi: OFFICER_ABI,
    functionName: 'getTeam'
  })) as readonly { contractType: string; contractAddress: Address }[]
  return contracts.find((c) => c.contractType === 'InvestorV1')?.contractAddress ?? null
}

/**
 * Copies shareholders from the previous Officer's InvestorV1 onto the new one
 * via `distributeMint`. Call directly for raw control, or use
 * `useMigrateShareholders` for TanStack-managed loading/error state.
 *
 * Guards:
 *   - totalSupply(new) == 0 → migrate
 *   - totalSupply(new) == sum(old shareholders) → noop-already-migrated
 *   - otherwise → throws {@link InconsistentSupplyError}
 */
export async function migrateShareholders(
  args: MigrateShareholdersArgs
): Promise<MigrateShareholdersResult> {
  const oldInvestor = await findInvestorAddress(args.previousOfficerAddress)
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

  const newSupply = (await readContract(config, {
    address: args.newInvestorAddress,
    abi: INVESTOR_ABI,
    functionName: 'totalSupply'
  })) as bigint

  if (newSupply > 0n) {
    const expected = shareholders.reduce((acc, s) => acc + s.amount, 0n)
    if (newSupply === expected) {
      return { kind: 'noop-already-migrated', matchedCount: shareholders.length }
    }
    throw new InconsistentSupplyError(newSupply, expected)
  }

  const hash = await writeContract(config, {
    address: args.newInvestorAddress,
    abi: INVESTOR_ABI,
    functionName: 'distributeMint',
    args: [shareholders.map((s) => ({ shareholder: s.shareholder, amount: s.amount }))]
  })
  await waitForTransactionReceipt(config, { hash })

  return { kind: 'done', migratedCount: shareholders.length, shareholders }
}

/**
 * TanStack-wrapped variant of {@link migrateShareholders}. Prefer this in
 * components: it exposes `mutateAsync`, `isPending`, `error`, `data` without
 * any manual ref juggling.
 */
export function useMigrateShareholders() {
  return useMutation<MigrateShareholdersResult, Error, MigrateShareholdersArgs>({
    mutationKey: ['migrateShareholders'],
    mutationFn: migrateShareholders
  })
}
