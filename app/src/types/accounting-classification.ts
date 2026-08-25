import type { ClassificationCategory } from '@/utils/accounting/classification'

/**
 * A manual Bank/Safe transaction classification as returned by the backend
 * (`GET /accounting/classification`), issue #2457. `txId` is the stable on-chain
 * identity `${txHash}-${logIndex}` the accounting engine keys ledger entries on.
 */
export interface TransactionClassificationRecord {
  id: number
  teamId: number
  txId: string
  category: ClassificationCategory
  memo: string | null
  classifiedByAddress: string | null
  createdAt: string
  updatedAt: string
  /** The user who last set the classification, joined by the backend for attribution. */
  classifiedBy?: {
    name: string | null
    address: string
    imageUrl: string | null
  } | null
}
