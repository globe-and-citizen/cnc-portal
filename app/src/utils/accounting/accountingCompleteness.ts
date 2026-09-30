/** Pure completeness projection for the Accounting source registry. */
import type { AccountingCompleteness, AccountingSourceStatus } from './types'

/**
 * Summarize all material source states. Fatal failures take precedence, then
 * initial loading, then partial evidence. Non-applicable sources do not reduce
 * completeness.
 */
export function accountingCompletenessOf(
  sources: readonly AccountingSourceStatus[]
): AccountingCompleteness {
  if (sources.some((source) => source.state === 'failed')) return 'failed'
  if (sources.some((source) => source.state === 'loading')) return 'loading'
  if (sources.some((source) => source.state === 'partial')) return 'partial'
  return 'ready'
}
