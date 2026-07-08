/**
 * Pure, framework-agnostic builder for the "Cash out all" plan.
 *
 * Kept free of Vue / wagmi so it can be unit-tested in isolation and reasoned
 * about without a component harness. The orchestrator (`useCashOutAll`) and the
 * UI consume the ordered step list this produces.
 */

export type CashOutStepKey = 'cashRemuneration' | 'expense' | 'bank'

/**
 * Display-time balance snapshot for the three accounts, expressed in the user's
 * local fiat. Only the sign (`> 0`) matters for deciding which steps to keep;
 * the magnitude is used by the UI for the review preview.
 */
export interface CashOutAccountBalances {
  cashRemuneration: number
  expense: number
  bank: number
}

export interface CashOutPlanStep {
  key: CashOutStepKey
  /** Human label shown in the stepper, e.g. "Cash Remuneration". */
  label: string
}

export const CASH_OUT_STEP_LABELS: Record<CashOutStepKey, string> = {
  cashRemuneration: 'Cash Remuneration',
  expense: 'Expense Account',
  bank: 'Bank'
}

/**
 * Builds the ordered cash-out plan from the three account balances.
 *
 * The order is fixed and intentional:
 *  1. Cash Remuneration and 2. Expense Account come first — both sweep their
 *     funds INTO the Bank (`ownerWithdrawAllToBank`).
 *  3. The Bank runs LAST and forwards everything to the owner's wallet, so the
 *     funds the source accounts just consolidated are not stranded.
 *
 * Empty source accounts are skipped. The Bank step is included whenever ANY
 * account holds funds, because the source sweeps may fill an otherwise-empty
 * Bank; if nothing actually remains at execution time the Bank step no-ops.
 */
export function buildCashOutPlan(balances: CashOutAccountBalances): CashOutPlanStep[] {
  const hasCash = balances.cashRemuneration > 0
  const hasExpense = balances.expense > 0
  const hasBank = balances.bank > 0

  const steps: CashOutPlanStep[] = []
  if (hasCash) steps.push({ key: 'cashRemuneration', label: CASH_OUT_STEP_LABELS.cashRemuneration })
  if (hasExpense) steps.push({ key: 'expense', label: CASH_OUT_STEP_LABELS.expense })
  if (hasCash || hasExpense || hasBank)
    steps.push({ key: 'bank', label: CASH_OUT_STEP_LABELS.bank })

  return steps
}
