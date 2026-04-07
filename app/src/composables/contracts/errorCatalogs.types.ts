import type { ClassifiedError } from '@/utils/classifyError'

/**
 * Per-contract registry of Solidity custom-error names → user-facing messages.
 *
 * Values can be:
 *  - a plain string (the message to show)
 *  - a function that receives the decoded `revertArgs` and returns a message
 *    (use this when you want to include dynamic data, e.g. addresses/amounts)
 */
export type RevertMessageResolver = (args?: readonly unknown[]) => string

export interface ContractErrorCatalog {
  /** Map of Solidity custom-error name → user message. */
  reverts: Record<string, string | RevertMessageResolver>
  /** Fallback for reverts this catalog doesn't know about. */
  fallback?: string
}

/**
 * Resolves a `ClassifiedError` to a user-facing message using a contract's
 * catalog. For non-revert errors (user_rejected, network, etc.) we fall back
 * to the classifier's default `userMessage`.
 */
export function resolveMessage(classified: ClassifiedError, catalog: ContractErrorCatalog): string {
  if (classified.category !== 'contract_revert' || !classified.revertName) {
    return classified.userMessage
  }
  const entry = catalog.reverts[classified.revertName]
  if (typeof entry === 'function') return entry(classified.revertArgs)
  if (typeof entry === 'string') return entry
  return catalog.fallback ?? classified.userMessage
}
