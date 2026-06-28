import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { roundInterest } from '@/utils/communityCreditUtil'
import type {
  CreditCallForm,
  CreditMember,
  CreditRole,
  CreditRound,
  RoundDetailVariant
} from '@/types'

import {
  CURRENT_USER,
  STARTING_BALANCE,
  cloneSeedMembers,
  cloneSeedRounds
} from './communityCreditSeed'

let roundSeq = 0

/**
 * Client-side state for the Community Credit demo. Holds the in-memory rounds,
 * the eligible members and the connected user's "view as" role, plus the
 * actions that lend / repay / publish rounds. No backend — everything is fake.
 */
export const useCommunityCreditStore = defineStore('communityCredit', () => {
  const rounds = ref<CreditRound[]>(cloneSeedRounds())
  const members = ref<CreditMember[]>(cloneSeedMembers())
  const accountBalance = ref(STARTING_BALANCE)
  const role = ref<CreditRole>('owner')
  const variant = ref<RoundDetailVariant>('ledger')

  const isOwner = computed(() => role.value === 'owner')
  const isLender = computed(() => role.value === 'lender')

  /** Rounds that are raising or in repayment. */
  const activeRounds = computed(() =>
    rounds.value.filter(
      (r) => r.status === 'open' || r.status === 'funded' || r.status === 'active'
    )
  )
  /** Completed or not-yet-launched rounds. */
  const historyRounds = computed(() =>
    rounds.value.filter((r) => r.status === 'repaid' || r.status === 'draft')
  )

  const outstandingPrincipal = computed(() =>
    activeRounds.value.reduce((sum, r) => sum + r.raised, 0)
  )
  const interestDue = computed(() =>
    activeRounds.value.reduce((sum, r) => sum + roundInterest(r), 0)
  )
  const lenderPositions = computed(() =>
    activeRounds.value.reduce((sum, r) => sum + r.lenders.length, 0)
  )
  const raisedLifetime = computed(() => rounds.value.reduce((sum, r) => sum + r.raised, 0))
  const repaidLifetime = computed(() =>
    rounds.value
      .filter((r) => r.status === 'repaid')
      .reduce((sum, r) => sum + r.raised + roundInterest(r), 0)
  )
  /**
   * Maturity of the next round to come due, or `—` when none are live.
   * Rounds already in repayment (funded/active) mature before rounds still
   * raising, so they take precedence.
   */
  const nextMaturity = computed(() => {
    const hasMaturity = (r: CreditRound) => Boolean(r.maturity) && r.maturity !== '—'
    const inRepayment = activeRounds.value.find(
      (r) => (r.status === 'active' || r.status === 'funded') && hasMaturity(r)
    )
    return (inRepayment ?? activeRounds.value.find(hasMaturity))?.maturity ?? '—'
  })

  function getRound(id: string | undefined): CreditRound | undefined {
    return rounds.value.find((r) => r.id === id)
  }

  function setRole(next: CreditRole) {
    role.value = next
  }

  function setVariant(next: RoundDetailVariant) {
    variant.value = next
  }

  /**
   * Lend `value` to a round on behalf of the current user. Clamps to the
   * round's remaining capacity, merges into any existing position, and flips
   * the round to `funded` once the target is reached.
   * @returns the amount actually added (0 if nothing was lent).
   */
  function lend(roundId: string, value: number): number {
    const round = getRound(roundId)
    if (!round) return 0
    const amount = Math.max(0, Math.floor(value) || 0)
    if (amount <= 0) return 0
    const remaining = round.target - round.raised
    const add = Math.min(amount, remaining)
    if (add <= 0) return 0

    const existing = round.lenders.find((l) => l.you)
    if (existing) {
      existing.amount += add
    } else {
      round.lenders.push({ ...CURRENT_USER, amount: add, date: 'today', you: true })
    }
    round.raised += add
    if (round.raised >= round.target) round.status = 'funded'
    return add
  }

  /** Mark a round as fully repaid. */
  function repay(roundId: string): boolean {
    const round = getRound(roundId)
    if (!round) return false
    round.status = 'repaid'
    round.repaidOn = 'today'
    return true
  }

  /** Publish a new credit call from the wizard form and return its id. */
  function createRound(form: CreditCallForm): string {
    const id = `round-${++roundSeq}`
    const round: CreditRound = {
      id,
      name: form.name.trim() || 'Untitled round',
      token: form.token,
      target: Number(form.target) || 0,
      raised: 0,
      rate: Number(form.rate) || 0,
      period: Number(form.period) || 0,
      status: 'open',
      opened: 'today',
      deadline: form.deadline || '—',
      maturity: '—',
      restricted: form.access === 'restricted',
      cap: form.capOn ? Number(form.cap) || null : null,
      desc: form.desc.trim() || 'New credit round.',
      lenders: []
    }
    rounds.value.unshift(round)
    return id
  }

  /** Restore the demo to its initial seed state. */
  function resetDemo() {
    rounds.value = cloneSeedRounds()
    accountBalance.value = STARTING_BALANCE
    role.value = 'owner'
    variant.value = 'ledger'
  }

  return {
    // state
    rounds,
    members,
    accountBalance,
    role,
    variant,
    // role helpers
    isOwner,
    isLender,
    // derived rounds
    activeRounds,
    historyRounds,
    // account stats
    outstandingPrincipal,
    interestDue,
    lenderPositions,
    raisedLifetime,
    repaidLifetime,
    nextMaturity,
    // actions
    getRound,
    setRole,
    setVariant,
    lend,
    repay,
    createRound,
    resetDemo
  }
})
