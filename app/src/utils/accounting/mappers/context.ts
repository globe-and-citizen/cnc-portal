/**
 * Shared, injectable context every source mapper needs.
 *
 * Keeping these as plain injected functions (rather than reaching into Vue
 * composables or module singletons) lets the mappers stay pure and unit-testable
 * with hand-built sample data. The reactive wiring (team contracts, the SHER mint
 * price, the FX rate-of-record) is assembled once by the orchestrator that drives
 * the mappers; the mappers themselves only see this context.
 */
import { getAddress, isAddress, zeroAddress, type Address } from 'viem'
import type { TokenId } from '@/constant'
import { resolveTokenIdByAddress } from '@/utils/tokens/metadata'
import { toUsd as toUsdUtil, type UsdRateOfRecord } from '@/utils/accounting/toUsd'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { ClassificationOverride } from '@/utils/accounting/classification'
import type { ContractType, TeamContract } from '@/types/teamContract'

export interface MapperContext {
  /** The team's own contract addresses (checksum-normalized). */
  internalAddresses: ReadonlySet<Address>
  /** Convert a raw base-unit amount to USD at the given time. */
  toUsd: (amount: bigint, token: TokenId, at: Date) => number
  /** Resolve a token contract address (nullish / zero = native) to a {@link TokenId}. */
  tokenIdOf: (tokenAddress: string | null | undefined) => TokenId
  /** The Cash pocket account of a CNC-owned address, or `null` if external. */
  pocketOf: (address: string | null | undefined) => AccountName | null
  /**
   * The legacy manual classification a team owner attached to a transaction (keyed by
   * the ledger entry id, i.e. `${txHash}-${logIndex}`), or `undefined` when none
   * exists. Source mappers apply it only to eligible external outflows; deposits and
   * company-pocket transfers are determined by their source evidence.
   */
  classificationOf: (id: string) => ClassificationOverride | undefined
}

/** Maps each CNC money-pocket contract type to its Cash account in the chart.
 * FixedReturn (Community Credit) holds lender deposits until the offer funds.
 *SafeDepositRouter holds no balance — the cash it routes lands in the Safe.
 */
const POCKET_ACCOUNT_BY_TYPE: Partial<Record<ContractType, AccountName>> = {
  Safe: 'Cash — Safe',
  Bank: 'Cash — Bank',
  CashRemunerationEIP712: 'Cash — Payroll',
  ExpenseAccountEIP712: 'Cash — Expense',
  FixedReturn: 'Cash — Credit',
  SafeDepositRouter: 'Cash — Safe'
}

function buildPocketIndex(
  contracts: readonly TeamContract[] | undefined
): Map<Address, AccountName> {
  const index = new Map<Address, AccountName>()
  for (const contract of contracts ?? []) {
    const account = POCKET_ACCOUNT_BY_TYPE[contract.type]
    if (account && isAddress(contract.address)) index.set(getAddress(contract.address), account)
  }
  return index
}

export interface BuildMapperContextInput {
  /** The team's `TeamContract` rows — resolve the internal pockets. */
  contracts: readonly TeamContract[] | undefined
  /** The set of internal addresses (from `collectInternalAddresses`). */
  internalAddresses: ReadonlySet<Address>
  /**
   * Legacy FeeCollector address input, retained for call-site compatibility. The
   * global protocol treasury is deliberately not added to the team pocket index.
   */
  feeCollectorAddress?: Address | string | null
  /** The on-chain SHER token address, so it resolves to the `sher` {@link TokenId}. */
  sherTokenAddress?: Address | string | null
  /** FX resolver for non-pegged tokens (native, SHER) — see {@link toUsdUtil}. */
  rateOfRecord?: UsdRateOfRecord
  /** Manual transaction classifications, keyed by ledger entry id (issue #2457). */
  classifications?: ReadonlyMap<string, ClassificationOverride>
}

/**
 * Assemble a {@link MapperContext} from a team's resolved data. The defaults wire
 * `toUsd` to the shared util and `tokenIdOf` to {@link resolveTokenIdByAddress}
 * (with an explicit SHER override, since SHER shares the zero-address sentinel
 * with native in the token table).
 */
export function buildMapperContext(input: BuildMapperContextInput): MapperContext {
  const pocketIndex = buildPocketIndex(input.contracts)
  const sher =
    input.sherTokenAddress && isAddress(input.sherTokenAddress)
      ? getAddress(input.sherTokenAddress)
      : null

  const tokenIdOf = (tokenAddress: string | null | undefined): TokenId => {
    if (!tokenAddress || !isAddress(tokenAddress) || getAddress(tokenAddress) === zeroAddress) {
      return 'native'
    }
    if (sher && getAddress(tokenAddress) === sher) return 'sher'
    return resolveTokenIdByAddress(tokenAddress) ?? 'native'
  }

  const pocketOf = (address: string | null | undefined): AccountName | null => {
    if (!address || !isAddress(address)) return null
    return pocketIndex.get(getAddress(address)) ?? null
  }

  const classifications = input.classifications
  const classificationOf = (id: string): ClassificationOverride | undefined =>
    classifications?.get(id)

  return {
    internalAddresses: input.internalAddresses,
    toUsd: (amount, token, at) => toUsdUtil(amount, token, at, input.rateOfRecord),
    tokenIdOf,
    pocketOf,
    classificationOf
  }
}

/** Convert an indexed event's Unix-seconds timestamp to a `Date` for FX lookup. */
export function atDate(timestampSeconds: number): Date {
  return new Date(timestampSeconds * 1000)
}
