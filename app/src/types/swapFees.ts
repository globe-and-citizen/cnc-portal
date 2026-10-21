import type { AssetId, AssetMetadata } from '@/utils/tokens/assets'

/** Confirmed CoW Trade log, scoped by the settlement contract and network. */
export interface CowTradeExecution {
  orderUid: string
  owner: string
  sellToken: string
  buyToken: string
  sellAmount: string
  buyAmount: string
  logIndex: number
}

/** Mined settlement receipt of one Safe swap. */
export interface SwapExecution {
  chainId: number
  transactionHash: string
  blockNumber: string
  cowTrades: CowTradeExecution[]
  networkFee?: { rawAmount: string; symbol: string; decimals: number; payer: string }
}

export interface SwapFeeAsset {
  address: string
  token: AssetId
  asset?: AssetMetadata
  rawAmount: string
  side: 'spent' | 'received'
}

/** One Safe swap read from its journal drafts, before any fee evidence is loaded. */
export interface SwapFeeTarget {
  txHash: string
  safeAddress: string
  assets: SwapFeeAsset[]
  timestamp: number
}

/** A fee amount in its original token, as reported by the swap provider. */
export interface SwapFeeAmount {
  tokenAddress: string
  rawAmount: string
}

export interface ProtocolFee extends SwapFeeAmount {
  policy: Record<string, unknown>
}

/** Provider fee records matched against the confirmed settlement. */
export interface SwapFeeVerification {
  /** Fee totals of this settlement per token; null when they cannot be verified. */
  fees: SwapFeeAmount[] | null
  /** Protocol fee components of the matched fills, already included in `fees`. */
  protocolFees: ProtocolFee[]
  /** Why the totals or their breakdown are missing. */
  reason?: string
}

/** Everything known about one swap's fees, shared by Accounting and the Safe page. */
export interface SwapFeeEvidence {
  target: SwapFeeTarget
  execution?: SwapExecution
  verification: SwapFeeVerification
  loading: boolean
  failed: boolean
}
