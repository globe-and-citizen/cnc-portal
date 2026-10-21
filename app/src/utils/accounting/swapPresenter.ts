/** Display rows for Safe swaps: the ledger's execution details. */
import { formatUnits } from 'viem'
import { formatExactNumber } from '@/utils/format'
import { currencySymbol, money } from './presenter'
import type { JournalEntry } from './types'

/** Ratio retained as exact base-unit integers; rounding belongs only to the label. */
export function swapExecutionDetails(entry: JournalEntry): string | undefined {
  if (entry.useCase !== 'SAFE-SWAP') return undefined
  const cash = entry.lines.filter(
    (line) => line.account.family.name === 'Cash — Safe' && line.movement
  )
  const incoming = cash.filter((line) => line.debit !== undefined)
  const outgoing = cash.filter((line) => line.credit !== undefined)
  if (incoming.length !== 1 || outgoing.length !== 1) return undefined
  const received = incoming[0]!.movement!
  const spent = outgoing[0]!.movement!
  if (
    received.decimals === null ||
    spent.decimals === null ||
    received.rawAmount <= 0n ||
    spent.rawAmount <= 0n
  )
    return undefined
  const ratio =
    (spent.rawAmount * 10n ** BigInt(received.decimals + 6)) /
    (received.rawAmount * 10n ** BigInt(spent.decimals))
  const spentSymbol = currencySymbol(spent.token, spent.asset)
  const receivedSymbol = currencySymbol(received.token, received.asset)
  const cost =
    received.valuationMethod === 'swap-consideration' ? money(incoming[0]!.debit!) : 'Unavailable'
  return (
    `Executed: ${ratio === 0n ? '<0.000001' : formatExactNumber(formatUnits(ratio, 6))} ${spentSymbol} / ${receivedSymbol}. ` +
    `Spent ${formatExactNumber(formatUnits(spent.rawAmount, spent.decimals))} ${spentSymbol}; ` +
    `received ${formatExactNumber(formatUnits(received.rawAmount, received.decimals))} ${receivedSymbol}. ` +
    `Acquisition cost: ${cost}. Network gas is not included.`
  )
}
