/**
 * Load immutable transaction evidence used by Accounting.
 *
 * A transaction sender identifies an internal-transfer initiator, while the
 * transaction receipt can prove a deployment-specific token cash pocket. These
 * two RPC reads share one transaction-evidence boundary and cache by hash.
 */
import { computed, type ComputedRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import type { Address } from 'viem'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import {
  needsAccountInstanceEvidence,
  transfersFromReceiptLogs,
  type TransactionAccountEvidence
} from '@/utils/accounting/accountInstances'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { config } from '@/wagmi.config'

/** Raised when one or more internal-transfer senders cannot be resolved. */
export class TransferInitiatorsError extends Error {
  constructor(readonly errors: unknown[]) {
    super(`Failed to resolve ${errors.length} transfer initiator(s)`)
    this.name = 'TransferInitiatorsError'
  }
}

interface ReceiptEvidenceResult {
  evidence: TransactionAccountEvidence
  unavailableOperationIds: readonly string[]
}

export interface UseTransactionEvidenceReturn {
  initiators: ComputedRef<Map<string, Address>>
  accountEvidence: ComputedRef<TransactionAccountEvidence>
  /** Transaction hashes whose receipt could not be read. */
  unavailableOperationIds: ComputedRef<readonly string[]>
  isLoading: ComputedRef<boolean>
  refetch: () => Promise<unknown>
}

/**
 * Read each internal-transfer signer and each receipt needed to identify a
 * deployment-scoped cash leg. Receipt failures stay explicit in the result so
 * the accounting view can surface them as reconciliation gaps.
 */
export function useTransactionEvidence(
  initiatorHashes: ComputedRef<readonly string[]>,
  entries: ComputedRef<readonly LedgerEntry[]>,
  accounts: ComputedRef<ReadonlyMap<string, AccountName>>
): UseTransactionEvidenceReturn {
  const receiptHashes = computed<string[]>(() => {
    const unresolved = new Set<string>()
    for (const entry of entries.value) {
      if (needsAccountInstanceEvidence(entry, accounts.value) && entry.txHash) {
        unresolved.add(entry.txHash.toLowerCase())
      }
    }
    return [...unresolved]
  })

  const initiatorsQuery = useQuery({
    queryKey: ['transfer-initiators', initiatorHashes],
    enabled: computed(() => initiatorHashes.value.length > 0),
    staleTime: Infinity,
    queryFn: async (): Promise<Map<string, Address>> => {
      const client = getPublicClient(config)
      if (!client) return new Map()
      const settled = await Promise.allSettled(
        initiatorHashes.value.map(async (hash) => {
          const tx = await client.getTransaction({ hash: hash as `0x${string}` })
          return [hash, tx.from] as const
        })
      )
      const errors = settled
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason)
      if (errors.length > 0) throw new TransferInitiatorsError(errors)
      return new Map(
        settled
          .filter(
            (result): result is PromiseFulfilledResult<readonly [string, Address]> =>
              result.status === 'fulfilled'
          )
          .map((result) => result.value)
      )
    }
  })

  const receiptsQuery = useQuery({
    queryKey: ['transaction-account-evidence', receiptHashes],
    enabled: computed(() => receiptHashes.value.length > 0),
    staleTime: Infinity,
    queryFn: async (): Promise<ReceiptEvidenceResult> => {
      const client = getPublicClient(config)
      if (!client) {
        return { evidence: new Map(), unavailableOperationIds: receiptHashes.value }
      }
      const settled = await Promise.allSettled(
        receiptHashes.value.map(async (hash) => {
          const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` })
          return [hash, transfersFromReceiptLogs(receipt.logs)] as const
        })
      )
      const evidence = new Map<string, ReturnType<typeof transfersFromReceiptLogs>>()
      const unavailableOperationIds: string[] = []
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') evidence.set(result.value[0], result.value[1])
        else {
          const hash = receiptHashes.value[index]
          if (hash) unavailableOperationIds.push(hash)
        }
      })
      return { evidence, unavailableOperationIds }
    }
  })

  return {
    initiators: computed(() => initiatorsQuery.data.value ?? new Map<string, Address>()),
    accountEvidence: computed(() => receiptsQuery.data.value?.evidence ?? new Map()),
    unavailableOperationIds: computed(
      () => receiptsQuery.data.value?.unavailableOperationIds ?? []
    ),
    isLoading: computed(() => initiatorsQuery.isLoading.value || receiptsQuery.isLoading.value),
    refetch: () => Promise.allSettled([initiatorsQuery.refetch?.(), receiptsQuery.refetch?.()])
  }
}
