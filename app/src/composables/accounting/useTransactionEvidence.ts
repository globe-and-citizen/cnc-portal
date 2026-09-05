/**
 * Load immutable transaction evidence used by Accounting.
 *
 * Transaction receipts can prove a deployment-specific token cash pocket.
 * Only unresolved operations need this immutable evidence, cached by hash.
 */
import { computed, type ComputedRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import {
  needsAccountInstanceEvidence,
  transfersFromReceiptLogs,
  type TransactionAccountEvidence
} from '@/utils/accounting/accountInstances'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { config } from '@/wagmi.config'

interface ReceiptEvidenceResult {
  evidence: TransactionAccountEvidence
  unavailableOperationIds: readonly string[]
}

export interface UseTransactionEvidenceReturn {
  accountEvidence: ComputedRef<TransactionAccountEvidence>
  /** Transaction hashes whose receipt could not be read. */
  unavailableOperationIds: ComputedRef<readonly string[]>
  isLoading: ComputedRef<boolean>
  refetch: () => Promise<unknown>
}

/**
 * Read each receipt needed to identify a
 * deployment-scoped cash leg. Receipt failures stay explicit in the result so
 * the accounting view can surface them as reconciliation gaps.
 */
export function useTransactionEvidence(
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
    accountEvidence: computed(() => receiptsQuery.data.value?.evidence ?? new Map()),
    unavailableOperationIds: computed(
      () => receiptsQuery.data.value?.unavailableOperationIds ?? []
    ),
    isLoading: computed(() => receiptsQuery.isLoading.value),
    refetch: () => Promise.allSettled([receiptsQuery.refetch?.()])
  }
}
