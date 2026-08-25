import { describe, expect, it } from 'vitest'
import type { SafeConfirmation, SafeTransaction } from '@/types/safe'
import {
  buildSafeTransactionQueueRows,
  getSafeTransactionFilterCounts,
  getSafeTransactionPermissions,
  getSafeTransactionState,
  hasConflictingSafeTransactions,
  matchesSafeTransactionFilter,
  willSafeTransactionApprovalCauseConflict
} from '@/utils/safeTransactionState'

const signer = '0x1111111111111111111111111111111111111111'

const makeConfirmation = (owner: string): SafeConfirmation => ({
  owner,
  submissionDate: '2026-08-20T10:00:00Z',
  transactionHash: null,
  signature: '0xsignature',
  signatureType: 'ETH_SIGN'
})

const makeTransaction = (overrides: Partial<SafeTransaction> = {}): SafeTransaction => ({
  safe: '0x2222222222222222222222222222222222222222',
  to: '0x3333333333333333333333333333333333333333',
  value: '0',
  operation: 0,
  safeTxGas: '0',
  baseGas: '0',
  gasPrice: '0',
  gasToken: '0x0000000000000000000000000000000000000000',
  nonce: 4,
  executionDate: null,
  submissionDate: '2026-08-20T10:00:00Z',
  modified: '2026-08-20T10:00:00Z',
  blockNumber: null,
  transactionHash: null,
  safeTxHash: '0xsafehash',
  executor: null,
  isExecuted: false,
  isSuccessful: null,
  confirmationsRequired: 2,
  confirmations: [],
  ...overrides
})

describe('getSafeTransactionState', () => {
  it.each([
    [{ isExecuted: true }, 'executed'],
    [{ nonce: 2 }, 'invalid'],
    [{ confirmations: [makeConfirmation(signer)] }, 'pending'],
    [{ confirmations: [makeConfirmation(signer), makeConfirmation('0xother')] }, 'ready']
  ])('classifies the transaction state', (overrides, expectedState) => {
    const transaction = makeTransaction(overrides as Partial<SafeTransaction>)

    expect(getSafeTransactionState(transaction, { currentNonce: 3 }).state).toBe(expectedState)
  })

  it('surfaces conflicts before the approval-ready state', () => {
    const transaction = makeTransaction({
      confirmations: [makeConfirmation(signer), makeConfirmation('0xother')]
    })

    expect(getSafeTransactionState(transaction, { currentNonce: 3, hasConflict: true }).state).toBe(
      'conflicting'
    )
  })

  it('explains how many approvals are still required', () => {
    const transaction = makeTransaction({ confirmationsRequired: 3, confirmations: [] })

    expect(getSafeTransactionState(transaction, { currentNonce: 3 }).nextStep).toBe(
      '3 more signer approvals are required.'
    )
  })
})

describe('Safe transaction conflicts', () => {
  const conflictContext = (transactions: SafeTransaction[]) => ({
    currentNonce: 3,
    threshold: 2,
    transactions
  })

  it('finds another pending transaction with a valid nonce', () => {
    const transaction = makeTransaction({ safeTxHash: '0xfirst', nonce: 4 })
    const otherPendingTransaction = makeTransaction({ safeTxHash: '0xsecond', nonce: 5 })

    expect(
      hasConflictingSafeTransactions(
        transaction,
        conflictContext([transaction, otherPendingTransaction])
      )
    ).toBe(true)
  })

  it('does not treat executed or stale transactions as conflicts', () => {
    const transaction = makeTransaction({ safeTxHash: '0xfirst', nonce: 4 })
    const executedTransaction = makeTransaction({
      safeTxHash: '0xexecuted',
      nonce: 5,
      isExecuted: true
    })
    const staleTransaction = makeTransaction({ safeTxHash: '0xstale', nonce: 2 })

    expect(
      hasConflictingSafeTransactions(
        transaction,
        conflictContext([transaction, executedTransaction, staleTransaction])
      )
    ).toBe(false)
  })

  it('warns about an approval only when it reaches the required threshold', () => {
    const transaction = makeTransaction({
      safeTxHash: '0xfirst',
      confirmations: [makeConfirmation(signer)]
    })
    const otherPendingTransaction = makeTransaction({ safeTxHash: '0xsecond', nonce: 5 })
    const context = conflictContext([transaction, otherPendingTransaction])

    expect(willSafeTransactionApprovalCauseConflict(transaction, context)).toBe(true)
    expect(
      willSafeTransactionApprovalCauseConflict(
        makeTransaction({ safeTxHash: '0xthird', confirmations: [] }),
        context
      )
    ).toBe(false)
  })
})

describe('buildSafeTransactionQueueRows', () => {
  it('prepares display and action data without passing callbacks to the list', () => {
    const transaction = makeTransaction({ safeTxHash: '0xfirst' })
    const rows = buildSafeTransactionQueueRows({
      currentNonce: 3,
      threshold: 2,
      transactions: [transaction],
      isSigner: true,
      connectedAddress: signer,
      isTransactionLoading: (safeTxHash, action) => safeTxHash === '0xfirst' && action === 'approve'
    })

    expect(rows).toEqual([
      expect.objectContaining({
        transaction,
        requiredConfirmations: 2,
        confirmationProgress: '0%',
        isApproving: true,
        isExecuting: false,
        permissions: expect.objectContaining({ canApprove: true })
      })
    ])
  })
})

describe('getSafeTransactionPermissions', () => {
  it('explains that a connected non-signer cannot act', () => {
    const permissions = getSafeTransactionPermissions(makeTransaction(), {
      state: 'pending',
      isSigner: false,
      connectedAddress: '0x9999999999999999999999999999999999999999'
    })

    expect(permissions.canApprove).toBe(false)
    expect(permissions.approveHint).toBe('Only a Safe signer can perform this action.')
  })

  it('prevents the connected signer from approving twice', () => {
    const transaction = makeTransaction({ confirmations: [makeConfirmation(signer)] })
    const permissions = getSafeTransactionPermissions(transaction, {
      state: 'pending',
      isSigner: true,
      connectedAddress: signer
    })

    expect(permissions.canApprove).toBe(false)
    expect(permissions.approveHint).toContain('already approved')
  })

  it('allows a signer to execute ready and conflicting transactions', () => {
    const transaction = makeTransaction({
      confirmations: [makeConfirmation(signer), makeConfirmation('0xother')]
    })
    for (const state of ['ready', 'conflicting'] as const) {
      expect(
        getSafeTransactionPermissions(transaction, {
          state,
          isSigner: true,
          connectedAddress: signer
        }).canExecute
      ).toBe(true)
    }
  })

  it('does not execute a conflicting transaction before it has enough approvals', () => {
    const permissions = getSafeTransactionPermissions(makeTransaction(), {
      state: 'conflicting',
      isSigner: true,
      connectedAddress: signer
    })

    expect(permissions.canExecute).toBe(false)
    expect(permissions.executeHint).toContain('remaining signer approvals')
  })
})

describe('matchesSafeTransactionFilter', () => {
  it('groups actionable states without terminal transactions', () => {
    expect(matchesSafeTransactionFilter('pending', 'needs-action')).toBe(true)
    expect(matchesSafeTransactionFilter('conflicting', 'needs-action')).toBe(true)
    expect(matchesSafeTransactionFilter('executed', 'needs-action')).toBe(false)
  })
})

describe('getSafeTransactionFilterCounts', () => {
  it('keeps actionability and individual state counts aligned', () => {
    expect(
      getSafeTransactionFilterCounts([
        'pending',
        'pending',
        'ready',
        'conflicting',
        'executed',
        'invalid'
      ])
    ).toEqual({
      all: 6,
      'needs-action': 4,
      pending: 2,
      ready: 1,
      conflicting: 1,
      executed: 1,
      invalid: 1
    })
  })
})
