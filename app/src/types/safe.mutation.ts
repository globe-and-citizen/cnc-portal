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
  body?: {
    /** Optional blockchain transaction hash */
    txHash?: string
  }
}

/**
 * Path parameters for Safe transaction endpoints
 */
export interface SafeTransactionPathParams {
  /** Safe transaction hash */
  safeTxHash: string
}
