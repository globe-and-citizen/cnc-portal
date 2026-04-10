import { computed, unref, type MaybeRef } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useConfig } from '@wagmi/vue'
import {
  simulateContract,
  writeContract,
  waitForTransactionReceipt,
  type SimulateContractParameters,
  type WaitForTransactionReceiptParameters,
  type Config
} from '@wagmi/core'
import { BaseError, type Abi, type Address } from 'viem'
import { log, parseErrorV2 } from '@/utils'

type SimulateParams = SimulateContractParameters<Abi, string, readonly unknown[], Config>
type WaitParams = WaitForTransactionReceiptParameters<Config>

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
 * Throws `ContractWriteRevertedError` when the transaction is mined but reverts,
 * with the ABI-decoded revert reason attached as `cause` when recoverable.
 */
export async function executeContractWrite(
  wagmiConfig: Config,
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
 * `args` and `value` are provided per-call to `mutateAsync` / `mutate`.
 */
export function useContractWritesV3(cfg: ContractWriteV3Config) {
  const queryClient = useQueryClient()
  const wagmiConfig = useConfig()

  const shouldLog = computed(() => cfg.config?.log ?? true)

  return useMutation({
    mutationFn: async (variables: ExecuteWriteVariables = {}) => {
      const address = unref(cfg.contractAddress)
      const functionName = unref(cfg.functionName)

      if (!address) throw new Error('Contract address is undefined')
      if (!functionName) throw new Error('Function name is undefined')

      return executeContractWrite(wagmiConfig, {
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
      const chainId = unref(cfg.chainId)
      // TanStack's partialMatchKey walks every key present in the invalidation
      // target and compares values by identity. `useReadContract` always stores
      // a concrete `chainId` in its query key (it injects `chainId ?? currentChainId`),
      // so passing `{ address, chainId: undefined }` here compares `undefined`
      // against e.g. `31337` and the match fails — no reads get invalidated.
      // Only include `chainId` when it was explicitly set on the V3 call; an
      // address-only target lets partialMatchKey ignore the chainId field on
      // the stored key and invalidate all reads against this contract.
      await queryClient.invalidateQueries({
        queryKey: [
          'readContract',
          {
            address,
            ...(chainId !== undefined ? { chainId } : {})
          }
        ]
      })
    }
  })
}
