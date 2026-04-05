import {
  BaseError,
  ChainDisconnectedError,
  ChainMismatchError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  HttpRequestError,
  InsufficientFundsError,
  TimeoutError,
  TransactionNotFoundError,
  UserRejectedRequestError,
  WaitForTransactionReceiptTimeoutError
} from 'viem'

/**
 * Semantic buckets for every error we expect from a wagmi/viem contract write.
 *
 * - `user_rejected`: user clicked "Reject" in their wallet — silent by default
 * - `insufficient_gas`: the signer doesn't have enough ETH to pay gas
 * - `chain_mismatch`: the wallet is on a different chain than the tx target
 * - `contract_revert`: EVM reverted with a decodable reason (ABI custom error)
 * - `no_contract`: no bytecode at the target address
 * - `network`: RPC unreachable, HTTP error, or timeout during a request
 * - `tx_dropped`: tx was replaced or not found after submission
 * - `unknown`: anything we couldn't classify — inspect `raw` to investigate
 */
export type ErrorCategory =
  | 'user_rejected'
  | 'insufficient_gas'
  | 'chain_mismatch'
  | 'contract_revert'
  | 'no_contract'
  | 'network'
  | 'tx_dropped'
  | 'unknown'

export interface ClassifiedError {
  category: ErrorCategory
  /** ABI-level custom error name when `category === 'contract_revert'` (e.g. "InsufficientTokenBalance") */
  revertName?: string
  /** Decoded args from the custom error, if any */
  revertArgs?: readonly unknown[]
  /** Short, user-friendly fallback message. Override per-feature with your own mapping. */
  userMessage: string
  /** The original error for logging / deep inspection. */
  raw: unknown
}

/**
 * Classifies a wagmi/viem error into a semantic category with a user-friendly
 * fallback message. Callers should branch on `category` (not parse the message)
 * and provide feature-specific overrides for `revertName`s they care about.
 *
 * @example
 * onError: (error) => {
 *   const c = classifyError(error)
 *   if (c.category === 'user_rejected') return // silent
 *   const custom = MY_FEATURE_MESSAGES[c.revertName ?? '']
 *   toast.add({ title: custom ?? c.userMessage, color: 'error' })
 * }
 */
export function classifyError(error: unknown): ClassifiedError {
  if (!(error instanceof Error)) {
    return {
      category: 'unknown',
      userMessage: 'An unexpected error occurred.',
      raw: error
    }
  }

  if (!(error instanceof BaseError)) {
    return {
      category: 'unknown',
      userMessage: error.message || 'An unexpected error occurred.',
      raw: error
    }
  }

  // Order matters: check user-rejection first, since wallets often wrap it
  // inside other error types (TransactionExecutionError, etc.).
  if (error.walk((e) => e instanceof UserRejectedRequestError)) {
    return {
      category: 'user_rejected',
      userMessage: 'Transaction was cancelled.',
      raw: error
    }
  }

  if (
    error.walk(
      (e) => e instanceof ChainMismatchError || e instanceof ChainDisconnectedError
    )
  ) {
    return {
      category: 'chain_mismatch',
      userMessage: 'Your wallet is connected to the wrong network.',
      raw: error
    }
  }

  const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
  if (revert instanceof ContractFunctionRevertedError) {
    // Solidity's built-in `Error(string)` surfaces as errorName: 'Error' with
    // the string message as the first arg — unwrap it for readability.
    const isPlainError = revert.data?.errorName === 'Error'
    const name = isPlainError
      ? ((revert.data?.args?.[0] as string) ?? 'Error')
      : (revert.data?.errorName ?? 'ContractRevert')

    return {
      category: 'contract_revert',
      revertName: name,
      revertArgs: revert.data?.args as readonly unknown[] | undefined,
      userMessage: name,
      raw: error
    }
  }

  if (error.walk((e) => e instanceof ContractFunctionZeroDataError)) {
    return {
      category: 'no_contract',
      userMessage: 'No contract found at this address.',
      raw: error
    }
  }

  if (error.walk((e) => e instanceof InsufficientFundsError)) {
    return {
      category: 'insufficient_gas',
      userMessage: 'Not enough ETH to cover gas fees.',
      raw: error
    }
  }

  if (
    error.walk(
      (e) =>
        e instanceof TransactionNotFoundError ||
        e instanceof WaitForTransactionReceiptTimeoutError
    )
  ) {
    return {
      category: 'tx_dropped',
      userMessage: 'Transaction was dropped or replaced. Please try again.',
      raw: error
    }
  }

  if (error.walk((e) => e instanceof HttpRequestError || e instanceof TimeoutError)) {
    return {
      category: 'network',
      userMessage: 'Network error. Please check your connection and try again.',
      raw: error
    }
  }

  // Last-resort fallback for un-matched BaseErrors
  return {
    category: 'unknown',
    userMessage: error.shortMessage || error.message,
    raw: error
  }
}
