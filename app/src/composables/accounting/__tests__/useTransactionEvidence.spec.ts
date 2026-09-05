import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import { useTransactionEvidence } from '../useTransactionEvidence'

const HASH_A = `0x${'a'.repeat(64)}`
const HASH_B = `0x${'b'.repeat(64)}`
const BANK = '0x1111111111111111111111111111111111111111' as Address

type CapturedConfig = { enabled: { value: boolean }; queryFn: () => Promise<unknown> }

function unresolvedEntry(hash: string): LedgerEntry {
  return makeEntry({
    id: `${hash}-1`,
    timestamp: 1,
    useCase: 'UC-CREDIT-01',
    debit: 'Cash — Bank',
    credit: 'Loan Payable',
    amountUsd: 1,
    token: 'usdc',
    rawAmount: '1000000',
    txHash: hash,
    memo: 'Credit funding'
  })
}

function useEvidence(entries: readonly LedgerEntry[]) {
  return useTransactionEvidence(
    computed(() => entries),
    computed(() => new Map<string, AccountName>([[BANK.toLowerCase(), 'Cash — Bank']]))
  )
}

describe('useTransactionEvidence', () => {
  let captured: CapturedConfig[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    captured = []
    useQueryFn.mockImplementation((cfg: unknown) => {
      captured.push(cfg as CapturedConfig)
      return {
        data: ref(undefined),
        isLoading: ref(false),
        refetch: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('disables receipt reads when no operation needs evidence', () => {
    useEvidence([])

    expect(captured.map((query) => query.enabled.value)).toEqual([false])
  })

  it('does not request receipt evidence for an already resolved deployment', () => {
    useEvidence([{ ...unresolvedEntry(HASH_A), debitInstance: BANK }])
    expect(captured.map((query) => query.enabled.value)).toEqual([false])
  })

  it('keeps required evidence unavailable when no RPC client exists', async () => {
    mockWagmiCore.getPublicClient.mockReturnValue(undefined)
    useEvidence([unresolvedEntry(HASH_A)])
    await expect(captured[0].queryFn()).resolves.toEqual({
      evidence: new Map(),
      unavailableOperationIds: [HASH_A]
    })
  })

  it('reads an unresolved receipt once and returns its transfer evidence', async () => {
    const getTransactionReceipt = vi.fn(async () => ({ logs: [] }))
    const getTransaction = vi.fn()
    mockWagmiCore.getPublicClient.mockReturnValue({ getTransactionReceipt, getTransaction })
    useEvidence([unresolvedEntry(HASH_A), unresolvedEntry(HASH_A)])

    expect(captured.map((query) => query.enabled.value)).toEqual([true])
    const result = (await captured[0].queryFn()) as {
      evidence: Map<string, unknown>
      unavailableOperationIds: string[]
    }

    expect(getTransactionReceipt).toHaveBeenCalledTimes(1)
    expect(getTransaction).not.toHaveBeenCalled()
    expect(result.evidence.has(HASH_A)).toBe(true)
    expect(result.unavailableOperationIds).toEqual([])
  })

  it('keeps receipt failures visible without losing successful evidence', async () => {
    const getTransactionReceipt = vi.fn(async ({ hash }: { hash: string }) => {
      if (hash === HASH_A) return { logs: [] }
      throw new Error('receipt unavailable')
    })
    mockWagmiCore.getPublicClient.mockReturnValue({ getTransactionReceipt })
    useEvidence([unresolvedEntry(HASH_A), unresolvedEntry(HASH_B)])

    const result = (await captured[0].queryFn()) as {
      evidence: Map<string, unknown>
      unavailableOperationIds: string[]
    }

    expect(result.evidence.has(HASH_A)).toBe(true)
    expect(result.unavailableOperationIds).toEqual([HASH_B])
  })
})
