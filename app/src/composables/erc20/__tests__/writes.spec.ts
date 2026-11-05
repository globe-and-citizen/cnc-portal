import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { erc20Abi, type Address } from 'viem'
import { mockWagmiCore } from '@/tests/mocks'
import { useMutationFn, useQueryClientFn } from '@/tests/mocks/composables.mock'

const { useMutation } =
  await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query')
const { useERC20Approve, useERC20Transfer } =
  await vi.importActual<typeof import('../writes')>('../writes')
const TOKEN = '0x1234567890123456789012345678901234567890'
const OTHER_TOKEN = '0x4444444444444444444444444444444444444444'
const RECIPIENT = '0x9876543210987654321098765432109876543210'
const AMOUNT = 1_000_000_000_000_000_000n
const HASH = `0x${'a'.repeat(64)}`
const variables = { args: [RECIPIENT, AMOUNT] } as const
const request = { address: TOKEN }
const receipt = { status: 'success', blockNumber: 10n }
let wrapper: VueWrapper
let client: QueryClient

beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  useMutationFn.mockImplementation(useMutation)
  useQueryClientFn.mockReturnValue(client)
  mockWagmiCore.simulateContract.mockResolvedValue({ request })
  mockWagmiCore.writeContract.mockResolvedValue(HASH)
  mockWagmiCore.waitForTransactionReceipt.mockResolvedValue(receipt)
})

afterEach(() => {
  wrapper?.unmount()
  client.clear()
})

describe.each([
  ['approve', useERC20Approve],
  ['transfer', useERC20Transfer]
] as const)('real ERC20 %s mutation', (functionName, useWrite) => {
  function setup(address: Ref<Address | undefined> = ref(TOKEN)) {
    let operation!: ReturnType<typeof useWrite>
    wrapper = mount(
      defineComponent({
        setup() {
          operation = useWrite(address)
          return () => h('div')
        }
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } }
    )
    return operation
  }

  it('submits the intended token method and arguments and returns its confirmed result', async () => {
    const operation = setup()
    await expect(operation.mutateAsync(variables)).resolves.toEqual({
      hash: HASH,
      receipt,
      simulation: { request }
    })
    expect(mockWagmiCore.simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ address: TOKEN, abi: erc20Abi, functionName, args: variables.args })
    )
    expect(mockWagmiCore.writeContract).toHaveBeenCalledWith(expect.anything(), request)
    expect(mockWagmiCore.waitForTransactionReceipt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ hash: HASH })
    )
    await nextTick()
    expect(operation.isSuccess.value).toBe(true)
    expect(operation.error.value).toBeNull()
  })

  it('uses the current reactive token address when submitted after setup', async () => {
    const address = ref<Address>()
    const operation = setup(address)
    address.value = OTHER_TOKEN
    await operation.mutateAsync(variables)
    expect(mockWagmiCore.simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ address: OTHER_TOKEN, functionName, args: variables.args })
    )
  })

  it('rejects an unavailable token address without submitting', async () => {
    const operation = setup(ref(undefined))
    await expect(operation.mutateAsync(variables)).rejects.toThrow('Contract address is undefined')
    await nextTick()
    expect(operation.isError.value).toBe(true)
    expect(mockWagmiCore.simulateContract).not.toHaveBeenCalled()
    expect(mockWagmiCore.writeContract).not.toHaveBeenCalled()
  })

  it.each(['simulation', 'submission', 'confirmation'] as const)(
    'preserves a %s failure in its rejection and reactive error state',
    async (phase) => {
      const error = new Error(`${phase} failed`)
      const dependency = {
        simulation: mockWagmiCore.simulateContract,
        submission: mockWagmiCore.writeContract,
        confirmation: mockWagmiCore.waitForTransactionReceipt
      }[phase]
      dependency.mockRejectedValueOnce(error)
      const operation = setup()
      await expect(operation.mutateAsync(variables)).rejects.toBe(error)
      await nextTick()
      expect(operation.error.value).toBe(error)
      expect(operation.isSuccess.value).toBe(false)
      if (phase === 'simulation') expect(mockWagmiCore.writeContract).not.toHaveBeenCalled()
      if (phase !== 'confirmation') {
        expect(mockWagmiCore.waitForTransactionReceipt).not.toHaveBeenCalled()
      }
    }
  )
})
