import type { SafeSignature, SafeTransferOptions, SafeTransaction } from './safe'

/**
 * Request body for proposing a transaction
 */
export interface ProposeTransactionBody {
  /** Recipient address */
  to: string
  /** Transaction value */
  value: string
  /** Transaction data */
  data: string
  /** Operation type */
  operation: number
  /** Safe transaction gas */
  safeTxGas: string
  /** Base gas */
  baseGas: string
  /** Gas price */
  gasPrice: string
  /** Gas token address */
  gasToken: string
  /** Refund receiver address */
  refundReceiver: string
  /** Transaction nonce */
  nonce: number
  /** Contract transaction hash */
  contractTransactionHash: string
  /** Sender address */
  sender: string
  /** Signature */
  signature: string
  /** Origin information */
  origin: string | null
}

/**
 * Combined parameters for useExecuteTransactionMutation
 */
export interface ExecuteTransactionParams {
  pathParams: {
    /** Safe address for query invalidation */
    safeAddress: string
    /** Safe transaction hash */
    safeTxHash: string
  }
  queryParams: {
    /** Chain ID for transaction service lookup */
    chainId: number
  }
  body: {
    /** Transaction data to execute */
    transactionData: SafeTransaction
  }
}

/**
 * Combined parameters for useApproveTransactionMutation
 */
export interface ApproveTransactionParams {
  pathParams: {
    /** Safe address */
    safeAddress: string
    /** Safe transaction hash */
    safeTxHash: string
  }
  queryParams: {
    /** Chain ID for transaction service lookup */
    chainId: number
  }
}

/**
 * Combined parameters for useUpdateSafeOwnersMutation
 */
export interface UpdateSafeOwnersParams {
  pathParams: {
    /** Safe address for query invalidation */
    safeAddress: string
  }
  queryParams: {
    /** Chain ID for transaction service lookup */
    chainId: number
  }
  body: {
    /** Owners to add */
    ownersToAdd?: string[]
    /** Owners to remove */
    ownersToRemove?: string[]
    /** New threshold */
    newThreshold?: number
    /** Whether to propose the transaction */
    shouldPropose?: boolean
    /** Safe transaction hash */
    safeTxHash?: string
    /** Signature data */
    signature?: SafeSignature | string
  }
}

/**
 * Combined parameters for useTransferFromSafeMutation
 */
export interface TransferFromSafeParams {
  safeAddress: string
  options: SafeTransferOptions
}
