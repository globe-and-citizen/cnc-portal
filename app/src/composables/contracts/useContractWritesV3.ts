import { computed, unref, type MaybeRef } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  simulateContract,
  writeContract,
  waitForTransactionReceipt,
  type SimulateContractParameters,
  type WaitForTransactionReceiptParameters
} from '@wagmi/core'
import { BaseError, type Abi, type Address } from 'viem'
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
 * Thrown when a transaction was mined but reverted on-chain.
 * Carries the full context (hash, receipt, simulation) so callers
 * can inspect gas used, logs, block number, etc. for debugging.
 *
 * Extends viem's `BaseError` and exposes the decoded revert reason via
 * `cause` so that `parseError(error, abi)` can `walk()` and extract the
 * ABI-level error name (e.g. "InsufficientTokenBalance").
 */
export class ContractWriteRevertedError extends BaseError {
  readonly hash: Awaited<ReturnType<typeof writeContract>>
  readonly receipt: Awaited<ReturnType<typeof waitForTransactionReceipt>>
  readonly simulation: Awaited<ReturnType<typeof simulateContract>>

  constructor(params: {
    hash: ContractWriteRevertedError['hash']
    receipt: ContractWriteRevertedError['receipt']
    simulation: ContractWriteRevertedError['simulation']
    cause?: BaseError
  }) {
    super('Transaction reverted on-chain', {
      cause: params.cause,
      metaMessages: [`hash: ${params.hash}`, `block: ${params.receipt.blockNumber}`]
    })
    this.name = 'ContractWriteRevertedError'
    this.hash = params.hash
    this.receipt = params.receipt
    this.simulation = params.simulation
  }
}

export interface ExecuteContractWriteParams {
  address: Address
  abi: Abi
  functionName: string
  chainId?: number
  args?: readonly unknown[]
  value?: bigint
}

export type ExecuteContractWriteResult = {
  hash: Awaited<ReturnType<typeof writeContract>>
  receipt: Awaited<ReturnType<typeof waitForTransactionReceipt>>
  simulation: Awaited<ReturnType<typeof simulateContract>>
}

/**
 * Standalone contract write: simulate -> write -> wait for receipt.
 *
 * Framework-agnostic (no Vue/TanStack dependencies). Throws
 * `ContractWriteRevertedError` when the transaction is mined but reverts,
 * with the ABI-decoded revert reason attached as `cause` when recoverable.
 */
export async function executeContractWrite(
  params: ExecuteContractWriteParams
): Promise<ExecuteContractWriteResult> {
  const { address, abi, functionName, args = [], value } = params
  const chainId = params.chainId as SimulateParams['chainId']

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

  // 3) Wait for receipt — throw on reverted so callers only see genuine success
  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    hash,
    chainId
  } as WaitParams)

  if (receipt.status !== 'success') {
    // Replay at the block just before mining to recover the ABI-decoded
    // revert reason (receipts don't carry it). viem will throw a
    // BaseError containing a ContractFunctionRevertedError in its chain.
    let revertCause: BaseError | undefined
    try {
      await simulateContract(wagmiConfig, {
        address,
        abi,
        functionName,
        args,
        chainId,
        blockNumber: receipt.blockNumber - 1n,
        ...(value !== undefined ? { value } : {})
      } as SimulateParams)
    } catch (replayErr) {
      if (replayErr instanceof BaseError) revertCause = replayErr
    }
    throw new ContractWriteRevertedError({ hash, receipt, simulation, cause: revertCause })
  }

  return { hash, receipt, simulation }
}

/**
 * V3: Lean contract write composable.
 *
 * Accepts contract coordinates (address, abi, functionName, chainId) at call time.
 * Wraps `executeContractWrite` in a TanStack mutation.
 *
 * `args` and `value` are provided per-call to `executeWrite` / `mutate`.
 */
export function useContractWritesV3(cfg: ContractWriteV3Config) {
  const queryClient = useQueryClient()

  const shouldLog = computed(() => cfg.config?.log ?? true)

  return useMutation({
    mutationFn: async (variables: ExecuteWriteVariables = {}) => {
      const address = unref(cfg.contractAddress)
      const functionName = unref(cfg.functionName)

      if (!address) throw new Error('Contract address is undefined')
      if (!functionName) throw new Error('Function name is undefined')

      return executeContractWrite({
        address,
        abi: unref(cfg.abi),
        functionName,
        chainId: unref(cfg.chainId),
        args: variables.args,
        value: variables.value
      })
    },
    onError: (error) => {
      if (shouldLog.value) {
        log.error(`useContractWritesV3(${unref(cfg.functionName)}) failed:\n`, parseErrorV2(error))
      }
    },
    onSuccess: async () => {
      const address = unref(cfg.contractAddress)
      if (!address) return
      const chainId = unref(cfg.chainId)
      const addressLower = address.toLowerCase()

      // Invalidate every `useReadContract` subscribed to this contract address.
      // We use a predicate rather than a partial-key target for two reasons:
      //
      //   1. `useReadContract` injects `chainId` into its stored queryKey, so
      //      a partial-key target that omits `chainId` matches by a subtle
      //      `partialMatchKey` contract and a target that includes
      //      `chainId: undefined` fails outright (`typeof undefined !== typeof 31337`).
      //      The predicate sidesteps both traps by reading the queryKey
      //      structurally.
      //   2. Address case drift: the stored key uses whatever address the
      //      caller passed; comparing lower-cased on both sides makes the
      //      match robust if viem ever checksum-normalises the string
      //      somewhere in the pipeline.
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          if (!Array.isArray(key) || key[0] !== 'readContract') return false
          const params = key[1] as { address?: string, chainId?: number } | undefined
          if (!params || typeof params !== 'object') return false
          if (typeof params.address !== 'string') return false
          if (params.address.toLowerCase() !== addressLower) return false
          // If the caller pinned a specific chainId, only invalidate reads on that chain.
          if (chainId !== undefined && params.chainId !== chainId) return false
          return true
        }
      })
    }
  })
}
