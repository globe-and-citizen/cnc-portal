import { describe, expect, it } from 'vitest'
import type { SafeConfirmation, SafeTransaction } from '@/types/safe'
import {
  getSafeTransactionPermissions,
  getSafeTransactionState,
  matchesSafeTransactionFilter
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
