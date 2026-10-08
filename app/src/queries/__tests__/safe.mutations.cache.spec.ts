import { QueryClient } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMutationFn, useQueryClientFn } from '@/tests/mocks/composables.mock'
import type { SafeExecutionResult } from '@/types/safe.mutation'
import { mockUseChainId } from '@/tests/mocks/wagmi.vue.mock'

const { safeKeys } = await vi.importActual<typeof import('../safe.queries')>('../safe.queries')
const mutations = await vi.importActual<typeof import('../safe.mutations')>('../safe.mutations')
const address = '0x0557F280D9DA274254e85Ee70c2936694e494275'
const chainId = 137

describe('Safe confirmed-operation cache refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChainId.value = chainId
  })

  const seed = (client: QueryClient) => {
    const keys = [
      safeKeys.balance(address, chainId),
      [...safeKeys.balance(address, chainId), 'safe-portfolio', { assets: [] }],
      safeKeys.transfers(address, chainId),
      safeKeys.incomingTransfers(address, 500),
      safeKeys.outgoingTransactions(address, 500)
    ]
    keys.forEach((key) => client.setQueryData(key, []))
    useQueryClientFn.mockReturnValueOnce(client as unknown as ReturnType<typeof useQueryClientFn>)
    return keys
  }

  it('invalidates both balance groups and every complete history after execution', async () => {
    const client = new QueryClient()
    const keys = seed(client)
    try {
      mutations.useExecuteTransactionMutation()
      const mutation = useMutationFn.mock.calls.at(-1)![0]
      await mutation.onSuccess('0xconfirmed', {
        pathParams: { safeAddress: address },
        queryParams: { chainId }
      })
      for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true)
    } finally {
      client.clear()
    }
  })

  it.each([true, false])(
    'refreshes economic reads only for an executed transfer: %s',
    async (executed) => {
      const client = new QueryClient()
      const keys = seed(client)
      try {
        mutations.useTransferFromSafeMutation()
        const mutation = useMutationFn.mock.calls.at(-1)![0]
        await mutation.onSuccess({ hash: '0xhash', executed } satisfies SafeExecutionResult, {
          pathParams: { safeAddress: address }
        })
        for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(executed)
      } finally {
        client.clear()
      }
    }
  )
})
