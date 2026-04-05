import { computed, unref, type MaybeRef } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  simulateContract,
  writeContract,
  waitForTransactionReceipt,
  type SimulateContractParameters,
  type WaitForTransactionReceiptParameters
} from '@wagmi/core'
import { type Abi, type Address } from 'viem'
import { config as wagmiConfig, type config as wagmiConfigType } from '@/wagmi.config'
import { log, parseErrorV2 } from '@/utils'

type WagmiConfig = typeof wagmiConfigType
type SimulateParams = SimulateContractParameters<Abi, string, readonly unknown[], WagmiConfig>
type WaitParams = WaitForTransactionReceiptParameters<WagmiConfig>

export interface ContractWriteV3Config {
  contractAddress: MaybeRef<Address | undefined>
  abi: MaybeRef<Abi>
  functionName: MaybeRef<string>
  chainId?: MaybeRef<number | undefined>
  config?: {
    log?: boolean
  }
}

export interface ExecuteWriteVariables {
  args?: readonly unknown[]
  value?: bigint
}

/**
 * V3: Lean contract write composable.
 *
 * Accepts contract coordinates (address, abi, functionName, chainId) at call time.
 * Internally runs: simulateContract -> writeContract -> waitForTransactionReceipt
 * inside a single TanStack mutation. Uses @wagmi/core directly (no wagmi/vue hooks).
 *
 * `args` and `value` are provided per-call to `executeWrite` / `mutate`.
 */
export function useContractWritesV3(cfg: ContractWriteV3Config) {
  const queryClient = useQueryClient()

  const shouldLog = computed(() => cfg.config?.log ?? true)

  return useMutation({
    mutationFn: async (variables: ExecuteWriteVariables = {}) => {
      const address = unref(cfg.contractAddress)
      const abi = unref(cfg.abi)
      const functionName = unref(cfg.functionName)
      const chainId = unref(cfg.chainId) as SimulateParams['chainId']

      if (!address) throw new Error('Contract address is undefined')
      if (!functionName) throw new Error('Function name is undefined')

      const args = (variables.args ?? []) as readonly unknown[]
      const value = variables.value

      // 1) Simulate
      const simulation = await simulateContract(wagmiConfig, {
        address,
        abi,
        functionName,
        args,
        chainId,
        ...(value !== undefined ? { value } : {})
      } as SimulateParams)

      // 2) Write — reuse the validated request from the simulation
      const hash = await writeContract(wagmiConfig, simulation.request)

      // 3) Wait for receipt
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId
      } as WaitParams)

      return { hash, receipt, simulation }
    },
    onError: (error) => {
      if (shouldLog.value) {
        log.error(
          `useContractWritesV3(${unref(cfg.functionName)}) failed:\n`,
          parseErrorV2(error)
        )
      }
    },
    onSuccess: async () => {
      const address = unref(cfg.contractAddress)
      const chainId = unref(cfg.chainId)
      await queryClient.invalidateQueries({
        queryKey: ['readContract', { address, chainId }]
      })
    }
  })
}
