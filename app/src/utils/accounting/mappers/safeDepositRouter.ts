/**
 * SafeDepositRouter source mapper — invest → SHER mint (spec §4, UC-SDR-01).
 *
 * An investor deposits a token through the router; the cash lands in the Safe and
 * SHER is minted in return:
 *
 *     Dr Cash — Safe        (deposited token, USD-valued)
 *        Cr Investor Equity
 *
 * The router event already carries both the deposited `tokenAmount` and the
 * `sherAmount`, so the equity is fully booked here. The matching `Investor
 * Minted` is **not** re-booked by the investor mapper — see {@link mapInvestorEvents}.
 */
import { formatUnits } from 'viem'
import type { SafeDepositRow } from '@/types/contract-events/investor'
import { makeJournalEntryDraft, type JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import type { MapperContext } from './context'

export interface SafeDepositRouterMapperInput {
  deposits?: readonly SafeDepositRow[]
}

/** Map every SafeDepositRouter `Deposited` event to a UC-SDR-01 entry. */
export function mapSafeDepositRouterEvents(
  input: SafeDepositRouterMapperInput,
  ctx: MapperContext
): JournalEntryDraft[] {
  return (input.deposits ?? []).map((row) => {
    const tokenId = ctx.tokenIdOf(row.token)
    return makeJournalEntryDraft({
      id: row.id,
      sourceContract: row.contractAddress,
      timestamp: row.timestamp,
      useCase: 'UC-SDR-01',
      debit: 'Cash — Safe',
      credit: 'Investor Equity',
      token: tokenId,
      rawAmount: row.tokenAmount,
      counterparty: row.depositor,
      txHash: row.txHash,
      shares: Number(formatUnits(BigInt(row.sherAmount), 6)),
      memo: 'Investment via SafeDepositRouter → SHER mint'
    })
  })
}
