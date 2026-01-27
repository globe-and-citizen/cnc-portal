import type {
  SafeMultisigTransactionResponse as SafeSdkMultisigTransactionResponse,
  SignatureType
} from '@safe-global/types-kit'

export interface SafeFiatTotal {
  value: number
  formated: string
  id: string
  code: string
  symbol: string
  price: number
  formatedPrice: string
}

export interface SafeInfo {
  address: string
  chain: string
  balance: string
  symbol: string
  totals?: Record<string, SafeFiatTotal>
  owners: string[]
  threshold: number
  nonce: number
  version: string
}

export interface SafeTransactionProposal {
  to: string
  value: string
  data: string
  operation: number
  safeTxGas: string
  baseGas: string
  gasPrice: string
  gasToken: string
  refundReceiver: string
  nonce: number
}

export interface ProposeTransactionParams {
  chainId: number
  safeAddress: string
  safeTxHash: string
  transactionData: SafeTransactionProposal
  sender: string
  signature: string
  origin?: string
}

export type SafeMultisigTransactionResponse = SafeSdkMultisigTransactionResponse

export interface SafeTransactionDataDecoded {
  method: string
  parameters: Array<{
    name: string
    type: string
    value: string
  }>
}

export interface SafeTransaction {
  safe: string
  to: string
  value: string
  data?: string | null
  operation: number
  safeTxGas: string | number
  baseGas: string | number
  gasPrice: string | number
  gasToken: string
  refundReceiver?: string | null
  nonce: number
  executionDate: string | null
  submissionDate: string
  modified: string
  blockNumber: number | null
  transactionHash: string | null
  safeTxHash: string
  proposer?: string | null
  proposedByDelegate?: string | boolean | null
  executor: string | null
  isExecuted: boolean
  isSuccessful: boolean | null
  ethGasPrice?: string | null
  maxFeePerGas?: string | null
  maxPriorityFeePerGas?: string | null
  gasUsed?: number | null
  fee?: string | null
  origin?: string | null
  confirmationsRequired: number
  confirmations: SafeConfirmation[]
  dataDecoded?: SafeTransactionDataDecoded | null
  trusted?: boolean
  signatures?: string | null
}

export interface SafeConfirmation {
  owner: string
  submissionDate: string
  transactionHash: string | null
  confirmationType?: string
  signature: string
  signatureType: SignatureType | string
}

export interface SafeSignature {
  data: string
  signer: string
}

export interface SafeDeploymentParams {
  chainId: number
  owners: string[]
  threshold: number
}

export interface SafeChainConfig {
  chain: string
  url: string
  nativeSymbol: string
}

export interface SafeAppUrls {
  home: string
  settings: string
}

export interface SafeBalanceItem {
  tokenAddress: string | null
  token: {
    name: string
    symbol: string
    decimals: number
    logoUri?: string
  } | null
  balance: string
  fiatBalance: string
  fiatConversion: string
}

export interface SafeDetails {
  owners: string[]
  threshold: number
  nonce: number
  version: string
}

export const TX_SERVICE_BY_CHAIN: Record<number, SafeChainConfig> = {
  137: {
    chain: 'polygon',
    url: 'https://safe-transaction-polygon.safe.global',
    nativeSymbol: 'POL'
  },
  11155111: {
    chain: 'sepolia',
    url: 'https://safe-transaction-sepolia.safe.global',
    nativeSymbol: 'ETH'
  },
  80002: { chain: 'amoy', url: 'https://safe-transaction-amoy.safe.global', nativeSymbol: 'MATIC' },
  42161: {
    chain: 'arbitrum',
    url: 'https://safe-transaction-arbitrum.safe.global',
    nativeSymbol: 'ETH'
  }
}

export const SAFE_VERSION = '1.4.1'

export const CHAIN_NAMES: Record<number, string> = {
  137: 'polygon',
  11155111: 'sepolia',
  80002: 'amoy',
  42161: 'arbitrum'
}

export type SafeTransactionConfirmation = SafeConfirmation

export type SafeTransactionConfirmations = SafeTransactionConfirmation[]

export interface SafeWallet {
  address: string
  name: string
  balance: string
}
