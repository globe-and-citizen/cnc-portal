/**
 * Pure helpers for draining the contracts of an ARCHIVED Officer generation.
 *
 * A team that redeploys its Officer keeps the previous generation on-chain: the
 * old Bank / Expense Account / Cash Remuneration still custody whatever they
 * held, but nothing in the new Officer's UI reaches them. These helpers say how
 * much of a given generation can be drained, and pick out the addresses the
 * cash-out sequence needs.
 *
 * Kept free of Vue / wagmi so the version rule stays unit-testable on its own.
 */

import type { FolderVersion } from '@/artifacts/registry'
import { CASH_OUT_STEP_LABELS, buildCashOutPlan } from './plan'
import type { CashOutAccountBalances, CashOutPlanStep } from './plan'

/**
 * Generations deployed BEFORE `ownerWithdrawAllToBank` existed on
 * ExpenseAccountEIP712 / CashRemunerationEIP712 — it landed in V1.
 *
 * Every generation is a distinct full redeployment behind its own frozen
 * beacons, so a V0 / V0.1 proxy can never gain the function: those two accounts
 * have to be emptied by hand (an EIP-712 budget approval on the Expense
 * Account, a signed wage claim on Cash Remuneration). Their Bank is unaffected —
 * `transfer` / `transferToken` have been there since V0. The set is a denylist
 * rather than an allowlist so a future generation is treated as supported by
 * default: new generations only ever add to the ABI.
 */
const FOLDERS_WITHOUT_OWNER_WITHDRAW = new Set<FolderVersion>(['V0', 'V0.1'])

/**
 * Whether `folder`'s Expense Account and Cash Remuneration expose
 * `ownerWithdrawAllToBank`, i.e. whether they can be swept into their Bank.
 *
 * An unresolved folder is NOT supported: never sweep an account whose
 * generation we could not confirm.
 */
export function supportsOwnerWithdrawAll(folder: FolderVersion | undefined): boolean {
  return folder !== undefined && !FOLDERS_WITHOUT_OWNER_WITHDRAW.has(folder)
}

/**
 * Ordered steps for draining ONE archived generation.
 *
 * With `canSweepSources`, this is the regular three-account sequence. Without it
 * — a V0 / V0.1 generation — only the Bank can be emptied: the source accounts
 * have no owner-drain path, so sweeping them is not on offer and the Bank step
 * is worth running only when the Bank itself holds something (nothing will
 * consolidate into it).
 */
export function buildLegacyWithdrawPlan(
  balances: CashOutAccountBalances,
  { canSweepSources }: { canSweepSources: boolean }
): CashOutPlanStep[] {
  if (canSweepSources) return buildCashOutPlan(balances)
  return balances.bank > 0 ? [{ key: 'bank', label: CASH_OUT_STEP_LABELS.bank }] : []
}

/** The subset of a generation's contracts the cash-out sequence drives. */
export interface LegacyGenerationAddresses {
  bank?: string
  expense?: string
  cashRemuneration?: string
}

/**
 * Pick the Bank / Expense Account / Cash Remuneration out of a generation's
 * contract list. A generation may be missing any of them (older deployments did
 * not always include every contract), hence the optional fields.
 */
export function legacyGenerationAddresses(
  contracts: ReadonlyArray<{ address: string; type: string }>
): LegacyGenerationAddresses {
  const byType = (type: string) => contracts.find((contract) => contract.type === type)?.address

  return {
    bank: byType('Bank'),
    expense: byType('ExpenseAccountEIP712'),
    cashRemuneration: byType('CashRemunerationEIP712')
  }
}
