import { describe, expect, it, beforeEach, vi } from 'vitest'
import { ref, toValue } from 'vue'
import type { Address } from 'viem'
import { useBalanceFn, useReadContractFn } from '@/tests/mocks/wagmi.vue.mock'

// `@/composables/useContractBalance` is globally mocked for component specs.
// This file is the one place that exercises the real implementation, so it
// reaches past the mock rather than replacing it.
const { useContractBalance } = await vi.importActual<
  typeof import('@/composables/useContractBalance')
>('@/composables/useContractBalance')

const BANK = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address

// wagmi is called with a config object whose fields may be refs; read them the
// way wagmi does rather than assuming they are plain values.
type BalanceConfig = { address?: unknown; query?: { enabled?: unknown } }
type ReadConfig = { args?: unknown; query?: { enabled?: unknown } }

const balanceConfig = () => useBalanceFn.mock.calls[0]?.[0] as unknown as BalanceConfig
const erc20Config = () => useReadContractFn.mock.calls[0]?.[0] as unknown as ReadConfig

describe('useContractBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // The address is almost never known at setup: it arrives with the team query,
  // or changes when the user switches team. A snapshot taken during setup leaves
  // the reads pointed at `undefined` for the lifetime of the component.
  it('follows an address that only resolves after setup', () => {
    const address = ref<Address | undefined>(undefined)

    useContractBalance(address)
    expect(toValue(balanceConfig().address)).toBeUndefined()

    address.value = BANK
    expect(toValue(balanceConfig().address)).toBe(BANK)
  })

  it('passes the resolved address through to the ERC20 reads too', () => {
    const address = ref<Address | undefined>(undefined)

    useContractBalance(address)
    address.value = BANK

    expect(toValue(erc20Config().args)).toEqual([BANK])
  })

  // Querying `balanceOf(undefined)` is a wasted RPC round-trip per token, per
  // account, per card.
  it('stays disabled while the address is unknown', () => {
    const address = ref<Address | undefined>(undefined)

    useContractBalance(address)

    expect(toValue(balanceConfig().query?.enabled)).toBe(false)
    expect(toValue(erc20Config().query?.enabled)).toBe(false)
  })

  it('enables the reads once the address is known', () => {
    const address = ref<Address | undefined>(undefined)

    useContractBalance(address)
    address.value = BANK

    expect(toValue(balanceConfig().query?.enabled)).toBe(true)
    expect(toValue(erc20Config().query?.enabled)).toBe(true)
  })

  it('accepts a plain address, not just a ref', () => {
    useContractBalance(BANK)

    expect(toValue(balanceConfig().address)).toBe(BANK)
    expect(toValue(balanceConfig().query?.enabled)).toBe(true)
  })
})
