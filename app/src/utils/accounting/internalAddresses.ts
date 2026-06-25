/**
 * Internal-address registry — tells the CNC's own contracts ("pockets") apart
 * from external counterparties.
 *
 * A value move *between* two internal addresses (funding payroll/expense from
 * Bank, the fee skim to FeeCollector, Safe → Bank transfers) is an **internal
 * move**, not revenue or expense (catalogue §4, spec §5.1). The mappers use
 * this set to avoid double-counting cash and inventing income.
 *
 * The reactive, team-scoped wrapper lives in
 * `@/composables/accounting/useTeamInternalAddresses`; the pure helpers here
 * carry the logic so they can be unit-tested without Vue.
 */
import { getAddress, isAddress, type Address } from 'viem'
import type { ContractType, TeamContract } from '@/types/teamContract'

/**
 * The CNC money-pocket contract types held in `TeamContract` (catalogue §1).
 * `FeeCollector` is intentionally **not** here: it is a single protocol-wide
 * contract, not a per-team `TeamContract`, so its address is folded in
 * separately by the composable from the deployed-addresses constant.
 */
export const INTERNAL_POCKET_CONTRACT_TYPES = [
  'Safe',
  'Bank',
  'CashRemunerationEIP712',
  'ExpenseAccountEIP712',
  'InvestorV1',
  'SafeDepositRouter'
] as const satisfies readonly ContractType[]

const INTERNAL_POCKET_TYPE_SET: ReadonlySet<ContractType> = new Set<ContractType>(
  INTERNAL_POCKET_CONTRACT_TYPES
)

/**
 * Build the set of a team's own ("internal") addresses from its contracts,
 * plus any extra protocol-wide addresses (e.g. the global FeeCollector).
 * Addresses are checksum-normalized so membership checks are exact.
 *
 * @param contracts The team's `TeamContract` rows.
 * @param extra Additional internal addresses not modelled as `TeamContract`
 *   (nullish entries are ignored).
 */
export function collectInternalAddresses(
  contracts: readonly TeamContract[] | undefined,
  extra: readonly (Address | string | null | undefined)[] = []
): Set<Address> {
  const set = new Set<Address>()
  for (const contract of contracts ?? []) {
    if (INTERNAL_POCKET_TYPE_SET.has(contract.type) && isAddress(contract.address)) {
      set.add(getAddress(contract.address))
    }
  }
  for (const address of extra) {
    if (address && isAddress(address)) set.add(getAddress(address))
  }
  return set
}

/**
 * Whether an address belongs to the team's own contracts. Invalid or missing
 * addresses are treated as external (returns `false`), never throwing.
 */
export function isInternalAddress(
  address: Address | string | null | undefined,
  internalAddresses: ReadonlySet<Address>
): boolean {
  if (!address || !isAddress(address)) return false
  return internalAddresses.has(getAddress(address))
}
