import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
import { type SafeDepositRouterFunctionName, isValidSafeDepositRouterFunction } from './types'
import {
  useContractWrites,
  type ContractWriteConfig,
  type ContractWriteOptions
} from '../contracts/useContractWrites'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'

/**
 * SafeDepositRouter contract write operations
 */
export function useSafeDepositRouterWrites() {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()
  const chainId = useChainId()

  const safeDepositRouterAddress = computed(() =>
    teamStore.getContractAddressByType('SafeDepositRouter')
  )

  const baseConfig: ContractWriteConfig = {
    contractAddress: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    chainId
  }

  const baseWrites = useContractWrites(baseConfig)

  const executeWrite = async (
    functionName: SafeDepositRouterFunctionName,
    args: readonly unknown[] = [],
    options?: ContractWriteOptions
  ) => {
    if (!isValidSafeDepositRouterFunction(functionName)) {
      throw new Error(`Invalid SafeDepositRouter function: ${functionName}`)
    }

    const result = await baseWrites.executeWrite(functionName, args, options)

    if (result) {
      queryClient.invalidateQueries({
        queryKey: ['safeDepositRouter', safeDepositRouterAddress.value]
      })
      queryClient.invalidateQueries({
        queryKey: ['team', 'contracts']
      })
    }

    return result
  }

  const estimateGas = async (
    functionName: SafeDepositRouterFunctionName,
    args: readonly unknown[] = [],
    value?: bigint
  ) => {
    if (!isValidSafeDepositRouterFunction(functionName)) {
      throw new Error(`Invalid SafeDepositRouter function: ${functionName}`)
    }

    return baseWrites.estimateGas(functionName, args, value)
  }

  const canExecuteTransaction = async (
    functionName: SafeDepositRouterFunctionName,
    args: readonly unknown[] = [],
    value?: bigint
  ) => {
    if (!isValidSafeDepositRouterFunction(functionName)) {
      throw new Error(`Invalid SafeDepositRouter function: ${functionName}`)
    }

    return baseWrites.canExecuteTransaction(functionName, args, value)
  }

  return {
    ...baseWrites,
    executeWrite,
    estimateGas,
    canExecuteTransaction,
    safeDepositRouterAddress
  }
}
