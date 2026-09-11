import {
  assembleWithAccountEvidence,
  buildCncJournalEntryDrafts,
  type CncAccounting,
  type CncAccountingInput
} from '../assemble'
import { knownDeploymentAccounts } from '../accountInstances'
import { finalizeJournalEntryDrafts } from '../journalEntry'
import type { JournalEntryDraft } from '../journalEntryDraft'
import type { JournalEntry } from '../types'

/** Assemble fixtures through the same public boundary as useCNCAccounting. */
export function assembleAccounting(input: CncAccountingInput): CncAccounting {
  return assembleWithAccountEvidence(
    buildCncJournalEntryDrafts(input),
    knownDeploymentAccounts(input.contracts),
    new Map(),
    input.accountAssignments
  )
}

/** Assemble hand-built postings through the public journal boundary. */
export function assembleRawAccounting(entries: readonly JournalEntryDraft[]): CncAccounting {
  return assembleWithAccountEvidence(entries, new Map(), new Map())
}

/** Finalize source drafts for focused report and presenter tests. */
export function finalizeJournal(entries: readonly JournalEntryDraft[]): JournalEntry[] {
  return finalizeJournalEntryDrafts(entries).journal
}
