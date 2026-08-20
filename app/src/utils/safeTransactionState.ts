import type { SafeTransaction } from '@/types/safe'
import type { UBadgeColor } from '@/types/ui'

export type SafeTransactionState = 'pending' | 'ready' | 'conflicting' | 'executed' | 'invalid'

export type SafeTransactionStatusFilter = 'all' | 'needs-action' | SafeTransactionState

export type SafeTransactionFilterCounts = Record<SafeTransactionStatusFilter, number>

export interface SafeTransactionStateContext {
  currentNonce: number
  threshold?: number
  hasConflict?: boolean
}

export interface SafeTransactionStateMeta {
  state: SafeTransactionState
  label: string
  color: UBadgeColor
  description: string
  nextStep: string
}

export interface SafeTransactionPermissions {
  canApprove: boolean
  canExecute: boolean
  approveHint: string
  executeHint: string
}

export function getSafeTransactionFilterCounts(
  states: SafeTransactionState[]
): SafeTransactionFilterCounts {
  const counts: SafeTransactionFilterCounts = {
    all: 0,
    'needs-action': 0,
    pending: 0,
    ready: 0,
    conflicting: 0,
    executed: 0,
    invalid: 0
  }

  for (const state of states) {
    counts.all += 1
    counts[state] += 1
    if (state === 'pending' || state === 'ready' || state === 'conflicting') {
      counts['needs-action'] += 1
    }
  }

  return counts
}

const confirmationCount = (transaction: SafeTransaction) => transaction.confirmations?.length ?? 0

const requiredConfirmationCount = (transaction: SafeTransaction, threshold?: number): number =>
  transaction.confirmationsRequired || threshold || 0

export function getSafeTransactionState(
  transaction: SafeTransaction,
  context: SafeTransactionStateContext
): SafeTransactionStateMeta {
  if (transaction.isExecuted) {
    return {
      state: 'executed',
      label: 'Executed',
      color: 'success',
      description: 'The Safe completed this transaction.',
      nextStep: 'No further signer action is required.'
    }
  }

  if (transaction.nonce < context.currentNonce) {
    return {
      state: 'invalid',
      label: 'Invalid',
      color: 'error',
      description: 'This transaction uses a nonce that the Safe has already passed.',
      nextStep: 'Create a new transaction if this action is still needed.'
    }
  }

  if (context.hasConflict) {
    return {
      state: 'conflicting',
      label: 'Conflicting',
      color: 'warning',
      description: 'Another pending transaction may be affected by this action.',
      nextStep: 'Review the other pending transactions before approving or executing.'
    }
  }

  const confirmations = confirmationCount(transaction)
  const required = requiredConfirmationCount(transaction, context.threshold)

  if (required > 0 && confirmations >= required) {
    return {
      state: 'ready',
      label: 'Ready to execute',
      color: 'info',
      description: 'The required signer approvals have been collected.',
      nextStep: 'A Safe signer can execute this transaction.'
    }
  }

  const remaining = Math.max(required - confirmations, 0)
  return {
    state: 'pending',
    label: 'Pending approvals',
    color: 'neutral',
    description: 'This transaction is waiting for signer approval.',
    nextStep:
      remaining === 1
        ? 'One more signer approval is required.'
        : `${remaining} more signer approvals are required.`
  }
}

interface SafeTransactionPermissionContext {
  state: SafeTransactionState
  isSigner: boolean
  connectedAddress?: string
  threshold?: number
}

export function getSafeTransactionPermissions(
  transaction: SafeTransaction,
  context: SafeTransactionPermissionContext
): SafeTransactionPermissions {
  const isTerminal = context.state === 'executed' || context.state === 'invalid'
  const hasRequiredApprovals =
    requiredConfirmationCount(transaction, context.threshold) > 0 &&
    confirmationCount(transaction) >= requiredConfirmationCount(transaction, context.threshold)
  const alreadyApproved = transaction.confirmations?.some(
    (confirmation) =>
      !!context.connectedAddress &&
      confirmation.owner.toLowerCase() === context.connectedAddress.toLowerCase()
  )

  const signerHint = context.connectedAddress
    ? 'Only a Safe signer can perform this action.'
    : 'Connect a Safe signer wallet to perform this action.'
  const approveHint = isTerminal
    ? context.state === 'executed'
      ? 'This transaction has already been executed.'
      : 'This transaction is invalid because its nonce has already been used.'
    : !context.isSigner
      ? signerHint
      : alreadyApproved
        ? 'Your connected wallet has already approved this transaction.'
        : 'Add your signer approval to this transaction.'
  const executeHint = isTerminal
    ? context.state === 'executed'
      ? 'This transaction has already been executed.'
      : 'This transaction is invalid because its nonce has already been used.'
    : !context.isSigner
      ? signerHint
      : !hasRequiredApprovals
        ? 'Wait for the remaining signer approvals before executing.'
        : 'Execute the approved transaction from the Safe.'

  return {
    canApprove: !isTerminal && context.isSigner && !alreadyApproved,
    canExecute:
      !isTerminal &&
      context.isSigner &&
      hasRequiredApprovals &&
      (context.state === 'ready' || context.state === 'conflicting'),
    approveHint,
    executeHint
  }
}

export function matchesSafeTransactionFilter(
  state: SafeTransactionState,
  filter: SafeTransactionStatusFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'needs-action') {
    return state === 'pending' || state === 'ready' || state === 'conflicting'
  }
  return state === filter
}
