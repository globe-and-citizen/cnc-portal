/**
 * Regression test for CONVENTIONS.md §5: every typed mutation error must
 * survive the real TanStack `useMutation` pipeline so consumers can branch
 * on `error.value instanceof TypedError`.
 *
 * The rest of the suite (`useShareholderMigration.spec.ts`) runs through the
 * global `useMutation` mock, which doesn't populate `error.value`. This file
 * deliberately bypasses that mock by reaching for the real
 * `@tanstack/vue-query` export and mounting a component against a fresh
 * `QueryClient`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { readContract } from '@wagmi/core'
import type { Address } from 'viem'
import { InconsistentSupplyError, migrateShareholders } from '../useShareholderMigration'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'

vi.mock('@/composables/contracts/useContractWritesV3', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    executeContractWrite: vi.fn()
  }
})

const realVueQuery =
  await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query')
const { useMutation: realUseMutation, QueryClient, VueQueryPlugin } = realVueQuery

const PREV_OFFICER = '0x1111111111111111111111111111111111111111' as Address
const OLD_INVESTOR = '0x2222222222222222222222222222222222222222' as Address
const NEW_INVESTOR = '0x3333333333333333333333333333333333333333' as Address
const SHAREHOLDER = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as Address

describe('InconsistentSupplyError — typed-error pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mutation.error.value preserves instanceof through the real useMutation pipeline', async () => {
    vi.mocked(readContract).mockImplementation(async (_cfg, params) => {
      const p = params as { functionName: string }
      if (p.functionName === 'getTeam') {
        return [{ contractType: 'InvestorV1', contractAddress: OLD_INVESTOR }]
      }
      if (p.functionName === 'getShareholders') {
        return [{ shareholder: SHAREHOLDER, amount: 100n }]
      }
      if (p.functionName === 'totalSupply') {
        return 999n
      }
      throw new Error(`unexpected readContract: ${p.functionName}`)
    })

    type Mutation = ReturnType<
      typeof realUseMutation<
        Awaited<ReturnType<typeof migrateShareholders>>,
        Error,
        Parameters<typeof migrateShareholders>[0]
      >
    >
    let captured: Mutation | null = null

    const Probe = defineComponent({
      setup() {
        captured = realUseMutation({ mutationFn: migrateShareholders })
        return () => h('div')
      }
    })

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } }
    })
    mount(Probe, {
      global: { plugins: [[VueQueryPlugin, { queryClient }]] }
    })

    expect(captured).not.toBeNull()
    const mutation = captured as unknown as Mutation

    await expect(
      mutation.mutateAsync({
        previousOfficerAddress: PREV_OFFICER,
        newInvestorAddress: NEW_INVESTOR
      })
    ).rejects.toBeInstanceOf(InconsistentSupplyError)

    await flushPromises()
    await nextTick()

    expect(mutation.isError.value).toBe(true)
    expect(mutation.error.value).toBeInstanceOf(InconsistentSupplyError)
    expect((mutation.error.value as InconsistentSupplyError).newSupply).toBe(999n)
    expect((mutation.error.value as InconsistentSupplyError).expectedSupply).toBe(100n)
    expect(executeContractWrite).not.toHaveBeenCalled()
  })
})
