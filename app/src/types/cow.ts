/** The CoW Protocol order fields read to report a swap's fee; amounts are integer strings in token units. */
export interface CowOrder {
  owner: string
  status: string
  sellToken: string
  buyToken: string
  executedFee?: string | null
  executedFeeToken?: string | null
}

/** The CoW Protocol orders one transaction settled; `data` stays undefined until they are known. */
export interface CowTransactionOrders {
  txHash: string
  data?: readonly CowOrder[]
}
