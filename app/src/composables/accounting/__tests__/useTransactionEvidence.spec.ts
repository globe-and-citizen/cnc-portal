import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import { TransferInitiatorsError, useTransactionEvidence } from '../useTransactionEvidence'

const HASH_A = `0x${'a'.repeat(64)}`
const HASH_B = `0x${'b'.repeat(64)}`
const BANK = '0x1111111111111111111111111111111111111111' as Address
const ALICE = '0x2222222222222222222222222222222222222222' as Address
const BOB = '0x3333333333333333333333333333333333333333' as Address

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

function useEvidence(initiatorHashes: readonly string[], entries: readonly LedgerEntry[]) {
  return useTransactionEvidence(
    computed(() => initiatorHashes),
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

  it('disables both immutable reads when no operation needs them', () => {
    useEvidence([], [])

    expect(captured.map((query) => query.enabled.value)).toEqual([false, false])
  })

  it('resolves each internal transfer hash to its transaction signer', async () => {
    const getTransaction = vi.fn(async ({ hash }: { hash: string }) => ({
      from: hash === HASH_A ? ALICE : BOB
    }))
    mockWagmiCore.getPublicClient.mockReturnValue({ getTransaction })
    useEvidence([HASH_A, HASH_B], [])

    const initiators = (await captured[0].queryFn()) as Map<string, Address>

    expect(initiators).toEqual(
      new Map([
        [HASH_A, ALICE],
        [HASH_B, BOB]
      ])
    )
  })

  it('keeps every transfer-sender failure explicit', async () => {
    const getTransaction = vi.fn(async ({ hash }: { hash: string }) => {
      if (hash === HASH_A) return { from: ALICE }
      throw new Error('not found')
    })
    mockWagmiCore.getPublicClient.mockReturnValue({ getTransaction })
    useEvidence([HASH_A, HASH_B], [])

    const error = await captured[0].queryFn().then(
      () => null,
      (reason) => reason
    )

    expect(error).toBeInstanceOf(TransferInitiatorsError)
    expect((error as TransferInitiatorsError).errors).toHaveLength(1)
  })

  it('reads an unresolved receipt once and returns its transfer evidence', async () => {
    const getTransactionReceipt = vi.fn(async () => ({ logs: [] }))
    mockWagmiCore.getPublicClient.mockReturnValue({ getTransactionReceipt })
    useEvidence([], [unresolvedEntry(HASH_A), unresolvedEntry(HASH_A)])

    expect(captured.map((query) => query.enabled.value)).toEqual([false, true])
    const result = (await captured[1].queryFn()) as {
      evidence: Map<string, unknown>
      unavailableOperationIds: string[]
    }

    expect(getTransactionReceipt).toHaveBeenCalledTimes(1)
    expect(result.evidence.has(HASH_A)).toBe(true)
    expect(result.unavailableOperationIds).toEqual([])
  })

  it('keeps receipt failures visible without losing successful evidence', async () => {
    const getTransactionReceipt = vi.fn(async ({ hash }: { hash: string }) => {
      if (hash === HASH_A) return { logs: [] }
      throw new Error('receipt unavailable')
    })
    mockWagmiCore.getPublicClient.mockReturnValue({ getTransactionReceipt })
    useEvidence([], [unresolvedEntry(HASH_A), unresolvedEntry(HASH_B)])

    const result = (await captured[1].queryFn()) as {
      evidence: Map<string, unknown>
      unavailableOperationIds: string[]
    }

    expect(result.evidence.has(HASH_A)).toBe(true)
    expect(result.unavailableOperationIds).toEqual([HASH_B])
  })
})
