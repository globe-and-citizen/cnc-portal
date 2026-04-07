import { computed, unref, type MaybeRef } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  sendTransaction,
  estimateGas,
  waitForTransactionReceipt,
  type WaitForTransactionReceiptParameters
} from '@wagmi/core'
import { getAddress, type Address } from 'viem'
import { config as wagmiConfig, type config as wagmiConfigType } from '@/wagmi.config'
import { log, parseErrorV2 } from '@/utils'

type WagmiConfig = typeof wagmiConfigType
type WaitParams = WaitForTransactionReceiptParameters<WagmiConfig>

export interface SendTransactionConfig {
  to: MaybeRef<Address | undefined>
  chainId?: MaybeRef<number | undefined>
  config?: {
    log?: boolean
    skipGasEstimation?: boolean
  }
}

export interface SendTransactionVariables {
  value: bigint
  data?: `0x${string}`
}

export interface ExecuteSendTransactionParams {
  to: Address
  value: bigint
  data?: `0x${string}`
  chainId?: number
  skipGasEstimation?: boolean
}

export type ExecuteSendTransactionResult = {
  hash: `0x${string}`
  receipt: Awaited<ReturnType<typeof waitForTransactionReceipt>>
}

/**
 * Standalone send transaction: estimate gas -> send -> wait for receipt.
 *
 * Framework-agnostic (no Vue/TanStack dependencies).
 * Throws on receipt with status !== 'success'.
 */
export async function executeSendTransaction(
  params: ExecuteSendTransactionParams
): Promise<ExecuteSendTransactionResult> {
  const { to, value, data, chainId, skipGasEstimation } = params

  // 1) Gas estimation (optional pre-check)
  if (!skipGasEstimation) {
    await estimateGas(wagmiConfig, {
      to,
      value,
      ...(data !== undefined ? { data } : {})
    })
  }

  // 2) Send transaction
  const hash = await sendTransaction(wagmiConfig, {
    to,
    value,
    ...(data !== undefined ? { data } : {})
  })

  // 3) Wait for receipt
  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    hash,
    chainId
  } as WaitParams)

  if (receipt.status !== 'success') {
    throw new Error(`Transaction reverted on-chain (hash: ${hash})`)
  }

  return { hash, receipt }
}

/**
 * Lean send-transaction composable.
 *
 * Accepts `to` and optional `chainId` at setup time.
 * `value` and `data` are provided per-call via `mutate` / `mutateAsync`.
 *
 * Wraps `executeSendTransaction` in a TanStack mutation and invalidates
 * balance queries for both sender and receiver on success.
 */
export function useSafeSendTransaction(cfg: SendTransactionConfig) {
  const queryClient = useQueryClient()

  const shouldLog = computed(() => cfg.config?.log ?? true)

  const mutation = useMutation({
    mutationFn: async (variables: SendTransactionVariables) => {
      const to = unref(cfg.to)
      if (!to) throw new Error('Recipient address (to) is undefined')

      return executeSendTransaction({
        to,
        value: variables.value,
        data: variables.data,
        chainId: unref(cfg.chainId),
        skipGasEstimation: cfg.config?.skipGasEstimation
      })
    },
    onError: (error) => {
      if (shouldLog.value) {
        log.error('useSafeSendTransaction failed:\n', parseErrorV2(error))
      }
    },
    onSuccess: async (_data) => {
      const receipt = _data.receipt
      const chainId = unref(cfg.chainId)

      // Invalidate balance queries for both sender and receiver
      const addresses = [receipt.to, receipt.from].filter(Boolean).map((a) => getAddress(a!))

      await Promise.all(
        addresses.map((address) =>
          queryClient.invalidateQueries({
            queryKey: ['balance', { address, chainId: chainId ?? receipt.chainId }]
          })
        )
      )
    }
  })

  return mutation
}
