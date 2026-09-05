import {
  assembleWithAccountEvidence,
  buildRawCncEntries,
  type CncAccounting,
  type CncAccountingInput
} from '../assemble'
import { knownDeploymentAccounts } from '../accountInstances'
import type { LedgerEntry } from '../ledgerEntry'

/** Assemble fixtures through the same public boundary as useCNCAccounting. */
export function assembleAccounting(input: CncAccountingInput): CncAccounting {
  return assembleWithAccountEvidence(
    buildRawCncEntries(input),
    knownDeploymentAccounts(input.contracts),
    new Map()
  )
}

/** Assemble hand-built postings through the public journal boundary. */
export function assembleRawAccounting(entries: readonly LedgerEntry[]): CncAccounting {
  return assembleWithAccountEvidence(entries, new Map(), new Map())
}
