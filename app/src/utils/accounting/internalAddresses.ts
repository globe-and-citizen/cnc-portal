/**
 * Internal-address registry — tells the CNC's own contracts ("pockets") apart
 * from external counterparties.
 *
 * A value move *between* two internal addresses (funding payroll/expense from
 * Bank or Safe → Bank transfers) is an **internal move**, not revenue or
 * expense. The global FeeCollector is deliberately excluded: a Bank fee is an
 * external company expense, not a move between company pockets.
 *
 * The reactive, team-scoped wrapper lives in
 * `@/composables/accounting/useTeamInternalAddresses`; the pure helpers here
 * carry the logic so they can be unit-tested without Vue.
 */
import { getAddress, isAddress, type Address } from 'viem'
import type { ContractType, TeamContract } from '@/types/teamContract'

/**
 * The CNC money-pocket contract types held in `TeamContract` (catalogue §1).
 * `FeeCollector` is intentionally **not** here: it is a protocol-wide
 * counterparty, not a CNC-owned pocket.
 */
const INTERNAL_POCKET_CONTRACT_TYPES = [
  'Safe',
  'Bank',
  'CashRemunerationEIP712',
  'ExpenseAccountEIP712',
  'FixedReturn',
  // Both share-token generations: teams on legacy Officers carry 'InvestorV1',
  // current ones 'Investor'. Omitting either makes that team's share token read
  // as an EXTERNAL counterparty, so its transfers get booked as third-party
  // movements instead of internal ones.
  'InvestorV1',
  'Investor',
  'SafeDepositRouter'
] as const satisfies readonly ContractType[]

const INTERNAL_POCKET_TYPE_SET: ReadonlySet<ContractType> = new Set<ContractType>(
  INTERNAL_POCKET_CONTRACT_TYPES
)

/**
 * Build the set of a team's own ("internal") addresses from its contracts.
 * Addresses are checksum-normalized so membership checks are exact.
 *
 * @param contracts The team's `TeamContract` rows.
 */
export function collectInternalAddresses(
  contracts: readonly TeamContract[] | undefined
): Set<Address> {
  const set = new Set<Address>()
  for (const contract of contracts ?? []) {
    if (INTERNAL_POCKET_TYPE_SET.has(contract.type) && isAddress(contract.address)) {
      set.add(getAddress(contract.address))
    }
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
