import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useCreateActionMutation } from '@/queries/action.queries'
import { useCreateBulkNotificationsMutation } from '@/queries/notification.queries'
import { mockTeamStore, mockWagmiCore } from '@/tests/mocks'
import { useMutationFn, useQueryClientFn } from '@/tests/mocks/composables.mock'

const { useMutation } =
  await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query')
const { useBodAddAction } = await vi.importActual<typeof import('../writes')>('../writes')
const BOD = '0x4444444444444444444444444444444444444444'
const input = {
  targetAddress: '0x1111111111111111111111111111111111111111',
  description: 'Transfer request',
  data: '0x',
  userAddress: '0x2222222222222222222222222222222222222222'
} as const
const hash = `0x${'a'.repeat(64)}`
const saveAction = vi.fn()
const notify = vi.fn()
let wrapper: VueWrapper
let client: QueryClient

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

function setup() {
  let operation!: ReturnType<typeof useBodAddAction>
  wrapper = mount(
    defineComponent({
      setup() {
        operation = useBodAddAction()
        return () => h('div')
      }
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } }
  )
  return operation
}

beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  useMutationFn.mockImplementation(useMutation)
  useQueryClientFn.mockReturnValue(client)
  mockTeamStore.currentTeamId = '1'
  mockTeamStore.getContractAddressByType.mockReturnValue(BOD)
  mockWagmiCore.readContract.mockImplementation(async (_config, params) =>
    params.functionName === 'getActionCount' ? 7n : [input.userAddress]
  )
  mockWagmiCore.simulateContract.mockResolvedValue({ request: { address: BOD } })
  mockWagmiCore.writeContract.mockResolvedValue(hash)
  mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success', blockNumber: 10n })
  saveAction.mockReset().mockResolvedValue({ id: 1 })
  notify.mockReset().mockResolvedValue(undefined)
  vi.mocked(useCreateActionMutation).mockReturnValue({ mutateAsync: saveAction } as ReturnType<
    typeof useCreateActionMutation
  >)
  vi.mocked(useCreateBulkNotificationsMutation).mockReturnValue({
    mutateAsync: notify
  } as ReturnType<typeof useCreateBulkNotificationsMutation>)
})

afterEach(() => {
  wrapper?.unmount()
  client.clear()
})

describe('Board action submission with the real mutation lifecycle', () => {
  it.each(['board', 'team'])(
    'rejects missing %s context and exposes the error',
    async (missing) => {
      if (missing === 'board') mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      else mockTeamStore.currentTeamId = null
      const operation = setup()
      await expect(operation.mutateAsync(input)).rejects.toThrow()
      await nextTick()
      expect(operation.isError.value).toBe(true)
      expect(operation.error.value).toBeInstanceOf(Error)
      expect(mockWagmiCore.writeContract).not.toHaveBeenCalled()
    }
  )

  it('keeps preparation pending and exposes an action-count failure without submitting', async () => {
    const failed = new Error('Action count unavailable')
    const count = deferred<bigint>()
    mockWagmiCore.readContract.mockReturnValueOnce(count.promise)
    const operation = setup()
    const request = operation.mutateAsync(input)
    await flushPromises()
    expect(operation.isPending.value).toBe(true)
    count.resolve(7n)
    await request
    mockWagmiCore.readContract.mockRejectedValueOnce(failed)
    await expect(operation.mutateAsync(input)).rejects.toBe(failed)
    await nextTick()
    expect(operation.error.value).toBe(failed)
    expect(operation.isSuccess.value).toBe(false)
    expect(mockWagmiCore.writeContract).toHaveBeenCalledTimes(1)
  })

  it('preserves a rejected contract submission and permits a later successful attempt', async () => {
    const error = new Error('Write rejected')
    mockWagmiCore.writeContract.mockRejectedValueOnce(error)
    const operation = setup()
    await expect(operation.mutateAsync(input)).rejects.toBe(error)
    await nextTick()
    expect(operation.error.value).toBe(error)
    expect(saveAction).not.toHaveBeenCalled()
    await expect(operation.mutateAsync(input)).resolves.toMatchObject({ hash })
    await nextTick()
    expect(operation.error.value).toBeNull()
    expect(operation.isSuccess.value).toBe(true)
  })

  it('keeps registration pending and registers the confirmed action before success', async () => {
    const registration = deferred<{ id: number }>()
    saveAction.mockReturnValueOnce(registration.promise)
    const operation = setup()
    const request = operation.mutateAsync(input)
    await flushPromises()
    expect(operation.isPending.value).toBe(true)
    expect(operation.isSuccess.value).toBe(false)
    expect(saveAction).toHaveBeenCalledWith({ body: { ...input, teamId: 1, actionId: 7 } })
    expect(notify).not.toHaveBeenCalled()
    registration.resolve({ id: 1 })
    await expect(request).resolves.toMatchObject({ hash })
    await nextTick()
    expect(operation.isSuccess.value).toBe(true)
  })

  it('reports confirmed-chain registration failure without retrying the write', async () => {
    client.setDefaultOptions({ mutations: { retry: 2, retryDelay: 0 } })
    saveAction.mockRejectedValueOnce(new Error('Registration unavailable'))
    const operation = setup()
    await expect(operation.mutateAsync(input)).rejects.toThrow(/confirmed.*record/i)
    await nextTick()
    expect(operation.isError.value).toBe(true)
    expect(operation.isSuccess.value).toBe(false)
    expect(mockWagmiCore.writeContract).toHaveBeenCalledTimes(1)
    expect(saveAction).toHaveBeenCalledTimes(1)
    expect(notify).not.toHaveBeenCalled()
  })

  it('handles mutate failures through the callback and reactive error without leaking a rejection', async () => {
    const error = new Error('Preparation failed')
    mockWagmiCore.readContract.mockRejectedValueOnce(error)
    const onError = vi.fn()
    const operation = setup()
    operation.mutate(input, { onError })
    await flushPromises()
    expect(onError).toHaveBeenCalledWith(error, input, undefined, expect.anything())
    expect(operation.error.value).toBe(error)
    expect(mockWagmiCore.writeContract).not.toHaveBeenCalled()
  })

  it('keeps success when Board-member discovery for notifications fails', async () => {
    mockWagmiCore.readContract
      .mockResolvedValueOnce(7n)
      .mockRejectedValueOnce(new Error('No members'))
    const operation = setup()
    await expect(operation.mutateAsync(input)).resolves.toMatchObject({ hash })
    await nextTick()
    expect(operation.isSuccess.value).toBe(true)
    expect(notify).not.toHaveBeenCalled()
  })

  it('treats failed notification delivery as successful registration', async () => {
    mockWagmiCore.readContract.mockResolvedValueOnce(7n).mockResolvedValueOnce([BOD])
    notify.mockRejectedValueOnce(new Error('Notifications unavailable'))
    const operation = setup()
    await expect(operation.mutateAsync(input)).resolves.toMatchObject({ hash })
    await nextTick()
    expect(operation.isSuccess.value).toBe(true)
    expect(operation.error.value).toBeNull()
  })

  it('pins the Board address and team while preparation is pending', async () => {
    const count = deferred<bigint>()
    mockWagmiCore.readContract.mockReturnValueOnce(count.promise)
    const operation = setup()
    const request = operation.mutateAsync(input)
    await flushPromises()
    mockTeamStore.currentTeamId = '2'
    mockTeamStore.getContractAddressByType.mockReturnValue(input.targetAddress)
    count.resolve(7n)
    await request
    expect(mockWagmiCore.simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ address: BOD })
    )
    expect(saveAction).toHaveBeenCalledWith({ body: expect.objectContaining({ teamId: 1 }) })
  })
})
