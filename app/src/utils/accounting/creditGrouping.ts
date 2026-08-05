/**
 * General-ledger presentation transform: fold a Community Credit round's
 * per-lender legs into **one company-level posting**.
 *
 * Lenders fund a round one deposit at a time, and the mapper books each deposit —
 * plus each lender's share of the fixed return, and each installment pushed back
 * to them — as its own posting, so the books can always say who is owed what.
 * Read as a journal that is far too granular: a round five members lent into
 * writes ten postings for what the team itself experiences as **one loan**.
 *
 * So the journal reads the round from the team's side. Every leg of a phase is
 * netted per account and rendered once:
 *   - **funding** — the deposits and the fixed return of one round
 *     (`UC-CREDIT-01` + `UC-CREDIT-05`), however many lenders and days it took:
 *     Dr Cash — Credit · Dr Interest Expense · Cr Loan Payable · Cr Interest
 *     Payable. The sweep of the principal out to the Bank (`UC-CREDIT-02`) keeps
 *     its own posting — that is the line naming the money actually arriving.
 *   - **repayment** — the principal and interest legs of one `repayLenders` call
 *     (`UC-CREDIT-03`), whatever number of lenders it paid: Dr Loan Payable ·
 *     Dr Interest Payable · Cr Cash — Bank (gross).
 *   - **refund** — the deposits handed back when a round missed its target
 *     (`UC-CREDIT-04`).
 * Installments are separate events, so their timestamp keeps them apart; two
 * rounds never merge either.
 *
 * The Activity narration is rewritten to match — no lender avatar, but what the
 * team borrowed and, on a repayment, what it just gave back **and what is still
 * owed** (`creditRemainingUsd`, carried from the mapper).
 *
 * Presentation-only: the canonical entries — and the statements they feed — are
 * untouched, each keeping its own lender, date and amount. Mirrors
 * {@link ./payrollGrouping}.
 */
import { money } from './presenter'
import { FEE_ACCOUNT } from './ledgerCategory'
import { makeEntry, type LedgerEntry, type UseCase } from './ledgerEntry'
import type { ActivityCell } from './describeEntry'
import type { AccountName } from './chartOfAccounts'
import type { LedgerRow } from './ledgerPresenter'
import type { TokenId } from '@/constant'

/** The empty activity carried by a compound posting's continuation rows. */
const NO_ACTIVITY: ActivityCell = { kind: 'plain', text: '' }

/** The lifecycle phase a round-level posting reports. */
type CreditPhase = 'funded' | 'repaid' | 'refunded'

const PHASE_OF: Partial<Record<UseCase, CreditPhase>> = {
  'UC-CREDIT-01': 'funded',
  'UC-CREDIT-05': 'funded',
  'UC-CREDIT-03': 'repaid',
  'UC-CREDIT-04': 'refunded'
}

/** The leg whose Action badge a phase's posting takes (see `./ledgerCategory`). */
const HEADLINE_LEG: Record<CreditPhase, UseCase> = {
  funded: 'UC-CREDIT-01',
  repaid: 'UC-CREDIT-03',
  refunded: 'UC-CREDIT-04'
}

/** The "Transaction" label of a round-level posting — the team's side of it. */
const PHASE_LABEL: Record<CreditPhase, string> = {
  funded: 'Credit loan received',
  repaid: 'Credit repayment',
  refunded: 'Credit principal refund'
}

/**
 * Entries that fold into one round-level posting share this key; `null` for
 * anything that always stands alone. A leg naming no round cannot be attributed
 * to one, so it is left as its own posting.
 */
export function creditGroupKey(entry: LedgerEntry): string | null {
  const round = entry.creditOfferId
  const phase = PHASE_OF[entry.useCase]
  if (!round || !phase) return null
  // A round funds once, however long it took to fill; a repayment or a refund is
  // a payment run of its own, so its timestamp keeps the installments apart.
  return phase === 'funded'
    ? `credit-funded|${round}`
    : `credit-${phase}|${round}|${entry.timestamp}`
}

/** One rendered journal line: an account and what the phase nets it to. */
interface NetLine {
  account: AccountName
  /** Net USD, debit-positive — a negative figure means the account is credited. */
  usd: number
  /** Net token movement in base units, same sign convention. */
  raw: bigint
  token: TokenId
  /** Rate of record, dropped when the legs behind the line disagree on it. */
  rate?: number
}

/** A stringified base-unit amount, tolerating a malformed value. */
function rawOf(amount: string): bigint {
  try {
    return BigInt(amount)
  } catch {
    return 0n
  }
}

/** Absolute value of a bigint — a rendered line always shows a positive amount. */
function abs(value: bigint): bigint {
  return value < 0n ? -value : value
}

/**
 * Sort rank within a phase, so the posting leads with the leg that names it: the
 * principal — lent, repaid or refunded — before the fixed return riding on it,
 * whatever order the feed happened to list them in.
 */
function legRank(entry: LedgerEntry): number {
  return entry.useCase === 'UC-CREDIT-05' || entry.debit === 'Interest Payable' ? 1 : 0
}

/**
 * Net every account the phase touched, debits positive, then order the result the
 * way a journal is written: all the debits first, then all the credits, each in
 * the order the account first appears.
 *
 * An account both sides moved through nets to nothing and is dropped — unless a
 * residue survives (legs valued at rates hours apart), which the posting has to
 * keep showing for its two columns to foot.
 */
function netLines(group: readonly LedgerEntry[]): NetLine[] {
  const totals = new Map<AccountName, NetLine>()
  const bump = (account: AccountName, usd: number, raw: bigint, token: TokenId, rate?: number) => {
    const line = totals.get(account)
    if (!line) {
      totals.set(account, { account, usd, raw, token, ...(rate != null ? { rate } : {}) })
      return
    }
    line.usd += usd
    line.raw += raw
    if (line.rate !== rate) delete line.rate
  }

  for (const entry of [...group].sort((a, b) => legRank(a) - legRank(b))) {
    const raw = rawOf(entry.rawAmount)
    if (entry.debit) bump(entry.debit, entry.amountUsd, raw, entry.token, entry.rate)
    if (entry.credit) bump(entry.credit, -entry.amountUsd, -raw, entry.token, entry.rate)
  }

  // A protocol fee skimmed on the same transaction ({@link mergeBankFees}) is
  // folded onto *every* leg of that transaction — one payment run pays one fee,
  // so it is added here once, as its own debit against the pocket it left.
  const charged = group.find((entry) => entry.mergedBankFee && entry.credit)
  const fee = charged?.mergedBankFee
  if (fee && charged?.credit) {
    const raw = rawOf(fee.rawAmount)
    bump(FEE_ACCOUNT, fee.amountUsd, raw, fee.token, fee.rate)
    bump(charged.credit, -fee.amountUsd, -raw, fee.token, fee.rate)
  }

  const lines = [...totals.values()].filter(
    (line) => line.raw !== 0n || Math.round(line.usd * 100) !== 0
  )
  return [...lines.filter((line) => line.usd > 0), ...lines.filter((line) => line.usd <= 0)]
}

/**
 * Render one netted line through the presenter — as a one-legged posting, so the
 * line keeps the Devise / Quantité / Taux columns of the amount it actually
 * aggregates, and every figure is formatted exactly as a plain posting's is.
 */
function lineRow(line: NetLine, source: LedgerEntry, rowsOf: RowsOf): LedgerRow | undefined {
  const debit = line.usd > 0
  return rowsOf(
    makeEntry({
      id: source.id,
      timestamp: source.timestamp,
      useCase: source.useCase,
      debit: debit ? line.account : null,
      credit: debit ? null : line.account,
      amountUsd: Math.abs(line.usd),
      token: line.token,
      rawAmount: abs(line.raw).toString(),
      ...(line.rate != null ? { rate: line.rate } : {}),
      // Kept so the netted line still knows which round it belongs to — it is
      // what lets its Activity link back to that round (see ./activityDestination).
      ...(source.creditOfferId != null ? { creditOfferId: source.creditOfferId } : {}),
      memo: source.memo
    })
  )[0]
}

/** Σ of the entries of one use case within a group. */
function sumOf(group: readonly LedgerEntry[], useCase: UseCase): number {
  return group.reduce((sum, entry) => sum + (entry.useCase === useCase ? entry.amountUsd : 0), 0)
}

/** How many distinct lenders a phase's legs name. */
function lenderCount(group: readonly LedgerEntry[]): number {
  return new Set(group.map((entry) => entry.counterparty).filter(Boolean)).size
}

/** `"3 lenders"` / `"1 lender"` — empty when no leg names one. */
function lenders(count: number): string {
  if (count <= 0) return ''
  return `${count} ${count === 1 ? 'lender' : 'lenders'}`
}

/**
 * What the round still owes once this payment run is booked — the smallest figure
 * its legs carry, since the mapper draws the debt down leg by leg. `null` when no
 * leg carries one (an older feed, or a phase that settles nothing).
 */
function remainingOf(group: readonly LedgerEntry[]): number | null {
  const figures = group
    .map((entry) => entry.creditRemainingUsd)
    .filter((value): value is number => value != null)
  return figures.length ? Math.min(...figures) : null
}

/** `" · $580.00 still owed"` — what a payment run leaves behind, if it is known. */
function remainingTail(group: readonly LedgerEntry[], settled: string): string {
  const remaining = remainingOf(group)
  if (remaining == null) return ''
  return remaining <= 0 ? ` · ${settled}` : ` · ${money(remaining)} still owed`
}

/** The narration of a funded round: what the team borrowed, and what it costs. */
function fundingActivity(group: readonly LedgerEntry[]): ActivityCell {
  const principal = sumOf(group, 'UC-CREDIT-01')
  const interest = sumOf(group, 'UC-CREDIT-05')
  const from = lenders(lenderCount(group.filter((e) => e.useCase === 'UC-CREDIT-01')))
  // A round whose deposits are out of view (the interest leg alone survived a
  // filter) can only report the fee it owes.
  if (principal <= 0) {
    return { kind: 'plain', text: `${money(interest)} of fixed return owed to the lenders` }
  }
  const tail = interest > 0 ? ` · ${money(interest)} of interest owed` : ''
  return {
    kind: 'plain',
    text: `Borrowed ${money(principal)}${from ? ` from ${from}` : ''}${tail}`
  }
}

/** The narration of a payment run: what went back, and what is left to pay. */
function paymentActivity(group: readonly LedgerEntry[], phase: CreditPhase): ActivityCell {
  const paid = group.reduce((sum, entry) => sum + entry.amountUsd, 0)
  const verb = phase === 'repaid' ? 'Repaid' : 'Refunded'
  const settled = phase === 'repaid' ? 'loan fully repaid' : 'every deposit returned'
  const to = lenders(lenderCount(group))
  return {
    kind: 'plain',
    text: `${verb} ${money(paid)}${to ? ` to ${to}` : ''}${remainingTail(group, settled)}`
  }
}

type RowsOf = (entry: LedgerEntry) => LedgerRow[]

/**
 * Render a Community Credit round's phase as one posting: its accounts netted,
 * debits then credits, under a single head that dates it, badges it and narrates
 * it from the team's point of view. Every following line renders head-less.
 *
 * `rowsOf` is injected (rather than imported) so this module needs no runtime
 * dependency on the presenter — only its `LedgerRow` type.
 */
export function compoundCreditRows(group: readonly LedgerEntry[], rowsOf: RowsOf): LedgerRow[] {
  const first = group[0]
  const phase = first ? PHASE_OF[first.useCase] : undefined
  const lines = netLines(group)
  if (!first || !phase || lines.length === 0) return group.flatMap(rowsOf)

  // The posting is dated by the leg that closed the phase — the moment the round
  // funded, or the payment run itself — and badged by the leg that names it.
  const timestamp = Math.max(...group.map((entry) => entry.timestamp))
  const headline = group.find((entry) => entry.useCase === HEADLINE_LEG[phase]) ?? first
  const source = { ...headline, timestamp }
  const rows = lines
    .map((line) => lineRow(line, source, rowsOf))
    .filter((row): row is LedgerRow => row != null)

  const activity = phase === 'funded' ? fundingActivity(group) : paymentActivity(group, phase)
  return rows.map((row, i) =>
    i === 0
      ? { ...row, isFirst: true, label: PHASE_LABEL[phase], activity }
      : {
          ...row,
          isFirst: false,
          date: '',
          label: '',
          activity: NO_ACTIVITY,
          destination: null,
          cat: '',
          catClass: ''
        }
  )
}
