import { describe, expect, it, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockWagmiCore } from '@/tests/mocks/wagmi.vue.mock'
import type { Address } from 'viem'
import { useTransferInitiators } from '../useTransferInitiators'

const HASH_A = '0xaaaa'
const HASH_B = '0xbbbb'
const ALICE = '0x1111111111111111111111111111111111111111' as Address

type CapturedConfig = { enabled: { value: boolean }; queryFn: () => Promise<unknown> }

describe('useTransferInitiators', () => {
  let captured: CapturedConfig | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    captured = null
    useQueryFn.mockImplementation((cfg: unknown) => {
      captured = cfg as CapturedConfig
      return { data: ref(undefined) }
    })
  })

  it('disables the query when there are no transfer hashes', () => {
    useTransferInitiators(computed(() => []))
    expect(captured?.enabled.value).toBe(false)
  })

  it('resolves each hash to its transaction signer, skipping failures', async () => {
    const getTransaction = vi.fn(async ({ hash }: { hash: string }) => {
      if (hash === HASH_A) return { from: ALICE }
      throw new Error('not found')
    })
    mockWagmiCore.getPublicClient.mockReturnValue({ getTransaction })

    useTransferInitiators(computed(() => [HASH_A, HASH_B]))
    expect(captured?.enabled.value).toBe(true)

    const map = (await captured!.queryFn()) as Map<string, Address>
    expect(map.get(HASH_A)).toBe(ALICE)
    expect(map.has(HASH_B)).toBe(false) // the failed lookup is omitted
  })

  it('returns an empty map when no public client is available', async () => {
    mockWagmiCore.getPublicClient.mockReturnValue(undefined)
    useTransferInitiators(computed(() => [HASH_A]))
    const map = (await captured!.queryFn()) as Map<string, Address>
    expect(map.size).toBe(0)
  })
})
