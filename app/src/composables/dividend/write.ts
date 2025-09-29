import { computed } from 'vue'
import { useAccount } from '@wagmi/vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useTeamStore } from '@/stores'
import {
  useContractWrites,
  type ContractWriteConfig,
  type ContractWriteOptions
} from '../contracts/useContractWrites'
import {
  DS_FUNCTION_NAMES,
  type DividendSplitterFunctionName,
  isValidDividendSplitterFunction
} from './types'
import { DIVIDEND_SPLITTER_ABI } from '@/artifacts/abi/dividend-splitter'

export function useDividendSplitterWrites() {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()
  const { chainId } = useAccount()

  const dsAddress = computed(() => teamStore.getContractAddressByType('DividendSplitter'))

  const baseWrites = useContractWrites({
    contractAddress: dsAddress.value!,
    abi: DIVIDEND_SPLITTER_ABI,
    chainId: chainId.value
  } as ContractWriteConfig)

  const invalidateDsQueries = async (functionName: DividendSplitterFunctionName) => {
    if (!dsAddress.value) return
    const keyBase = { address: dsAddress.value, chainId: chainId.value }

    switch (functionName) {
      case DS_FUNCTION_NAMES.PAUSE:
      case DS_FUNCTION_NAMES.UNPAUSE:
        await queryClient.invalidateQueries({
          queryKey: ['readContract', { ...keyBase, functionName: DS_FUNCTION_NAMES.PAUSED }]
        })
        break

      case DS_FUNCTION_NAMES.SET_INVESTOR:
        await queryClient.invalidateQueries({
          queryKey: ['readContract', { ...keyBase, functionName: DS_FUNCTION_NAMES.INVESTOR }]
        })
        await queryClient.invalidateQueries({
          queryKey: ['readContract', { ...keyBase, functionName: DS_FUNCTION_NAMES.INVESTOR_SET }]
        })
        break

      case DS_FUNCTION_NAMES.CLAIM:
        await queryClient.invalidateQueries({
          queryKey: ['readContract', { ...keyBase, functionName: DS_FUNCTION_NAMES.RELEASABLE }]
        })
        await queryClient.invalidateQueries({
          queryKey: [
            'readContract',
            { ...keyBase, functionName: DS_FUNCTION_NAMES.TOTAL_ALLOCATED }
          ]
        })
        await queryClient.invalidateQueries({
          queryKey: ['readContract', { ...keyBase, functionName: DS_FUNCTION_NAMES.TOTAL_RELEASED }]
        })
        break

      case DS_FUNCTION_NAMES.TRANSFER_OWNERSHIP:
        await queryClient.invalidateQueries({
          queryKey: ['readContract', { ...keyBase, functionName: DS_FUNCTION_NAMES.OWNER }]
        })
        break

      default:
        await queryClient.invalidateQueries({ queryKey: ['readContract', keyBase] })
        break
    }
  }

  const executeWrite = async (
    functionName: DividendSplitterFunctionName,
    args: readonly unknown[] = [],
    value?: bigint,
    options?: ContractWriteOptions
  ) => {
    if (!isValidDividendSplitterFunction(functionName)) {
      throw new Error(`Invalid DividendSplitter function: ${functionName}`)
    }
    const tx = await baseWrites.executeWrite(functionName, args, value, options)
    // Try to invalidate eagerly (also rely on your global watcher if any)
    await invalidateDsQueries(functionName)
    return tx
  }

  return {
    ...baseWrites,
    executeWrite,
    invalidateDsQueries
  }
}
