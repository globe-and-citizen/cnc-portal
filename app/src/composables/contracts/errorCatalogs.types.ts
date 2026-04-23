export type RevertMessageResolver = (args?: readonly unknown[]) => string

export type ContractKey =
  | 'CashRemuneration'
  | 'ExpenseAccount'
  | 'SafeDepositRouter'
  | 'Bank'
  | 'AdCampaignManager'
  | 'Vesting'
  | 'InvestorV1'
  | 'Tips'
  | 'FeeCollector'
  | 'TokenSupport'
  | 'Elections'
  | 'Proposals'
  | 'Voting'
  | 'BoardOfDirectors'
  | 'Officer'

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
 * Resolves a revert name to a user-facing message using the unified catalog.
 * Resolution order: perContract[contract][name] → common[name] → fallbacks[contract] → fallbacks.default.
 */
export function resolveFromCatalog(
  catalog: ContractErrorCatalog,
  revertName: string,
  revertArgs?: readonly unknown[],
  contract?: ContractKey
): string {
  if (contract) {
    const override = applyEntry(catalog.perContract[contract]?.[revertName], revertArgs)
    if (override !== undefined) return override
  }
  const shared = applyEntry(catalog.common[revertName], revertArgs)
  if (shared !== undefined) return shared
  if (contract && catalog.fallbacks[contract]) return catalog.fallbacks[contract] as string
  return catalog.fallbacks.default
}
