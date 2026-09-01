export type RevertMessageResolver = (args?: readonly unknown[]) => string

export type ContractKey =
  | 'CashRemuneration'
  | 'ExpenseAccount'
  | 'SafeDepositRouter'
  | 'Bank'
  | 'AdCampaignManager'
  | 'Vesting'
  | 'Investor'
  | 'FeeCollector'
  | 'TokenSupport'
  | 'Elections'
  | 'Proposals'
  | 'Voting'
  | 'BoardOfDirectors'
  | 'Officer'
  | 'FixedReturn'

export interface ContractErrorCatalog {
  /** Shared messages: OZ-inherited errors and names with identical semantics across contracts. */
  common: Record<string, string | RevertMessageResolver>
  /** Per-contract overrides for names whose meaning or arg shape differs per contract. */
  perContract: Partial<Record<ContractKey, Record<string, string | RevertMessageResolver>>>
  /** Fallback text when a revert name isn't mapped. `default` is required. */
  fallbacks: Partial<Record<ContractKey, string>> & { default: string }
}

function applyEntry(
  entry: string | RevertMessageResolver | undefined,
  args?: readonly unknown[]
): string | undefined {
  if (typeof entry === 'function') return entry(args)
  if (typeof entry === 'string') return entry
  return undefined
}

/**
 * Our Solidity errors are declared the house way — `Elections__ElectionNotActive`,
 * `ElectionUtils__InvalidSeatCount` — while the catalog is keyed by the meaning
 * alone. Without dropping the prefix every one of those reverts resolves to
 * nothing and reaches the user as the contract's shrug of a fallback, which is
 * how "Election is not currently active" became "Election action failed".
 */
function withoutContractPrefix(revertName: string): string {
  const separator = revertName.indexOf('__')
  return separator === -1 ? revertName : revertName.slice(separator + 2)
}

/**
 * Resolves a revert name to a user-facing message using the unified catalog.
 * Resolution order: perContract[contract][name] → common[name] → fallbacks[contract] → fallbacks.default,
 * each name tried as declared and again with its `Contract__` prefix removed.
 */
export function resolveFromCatalog(
  catalog: ContractErrorCatalog,
  revertName: string,
  revertArgs?: readonly unknown[],
  contract?: ContractKey
): string {
  const names = [revertName, withoutContractPrefix(revertName)]

  for (const name of names) {
    if (contract) {
      const override = applyEntry(catalog.perContract[contract]?.[name], revertArgs)
      if (override !== undefined) return override
    }
    const shared = applyEntry(catalog.common[name], revertArgs)
    if (shared !== undefined) return shared
  }

  if (contract && catalog.fallbacks[contract]) return catalog.fallbacks[contract] as string
  return catalog.fallbacks.default
}
