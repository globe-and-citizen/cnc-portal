import { computed, type MaybeRef } from 'vue'
import type { Address } from 'viem'
import { useQueryClient } from '@tanstack/vue-query'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type SafeDepositRouterFunctionNames = ExtractAbiFunctionNames<typeof SAFE_DEPOSIT_ROUTER_ABI>

// ============================================================================
// Base Write Helper
// ============================================================================
function useSafeDepositRouterContractWrite(options: {
  functionName: SafeDepositRouterFunctionNames
  args?: MaybeRef<readonly unknown[]>
  value?: MaybeRef<bigint>
}) {
  const teamStore = useTeamStore()
  const safeDepositRouterAddress = computed(() =>
    teamStore.getContractAddressByType('SafeDepositRouter')
  )

  return useContractWrites({
    contractAddress: safeDepositRouterAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: options.functionName,
    args: options.args ?? [],
    ...(options.value !== undefined ? { value: options.value } : {})
  })
}

// ============================================================================
// Admin Functions - Simple Pattern (No Args)
// ============================================================================

export function useEnableDeposits() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'enableDeposits'
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([])
  }
}

export function useDisableDeposits() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'disableDeposits'
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([])
  }
}

// UNUSED — no consumers outside safeDepositRouter.setup.ts.
/*
export function usePauseContract() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'pause'
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([])
  }
}

export function useUnpauseContract() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'unpause'
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([])
  }
}
*/

export function useRenounceOwnership() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'renounceOwnership'
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([])
  }
}

// ============================================================================
// Configuration Functions - Dynamic Args Pattern
// ============================================================================

export function useTransferOwnership() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'transferOwnership'
  })

  return {
    ...write,
    executeWrite: (newOwner: Address) => write.executeWrite([newOwner])
  }
}

export function useSetSafeAddress() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'setSafeAddress'
  })

  return {
    ...write,
    executeWrite: (newSafeAddress: Address) =>
      write.executeWrite([newSafeAddress], undefined, { skipGasEstimation: true })
  }
}

export function useSetMultiplier() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'setMultiplier'
  })

  return {
    ...write,
    executeWrite: (newMultiplier: bigint) =>
      write.executeWrite([newMultiplier], undefined, { skipGasEstimation: true })
  }
}

export function useAddTokenSupport() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'addTokenSupport'
  })

  return {
    ...write,
    executeWrite: (tokenAddress: Address) => write.executeWrite([tokenAddress])
  }
}

export function useRemoveTokenSupport() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'removeTokenSupport'
  })

  return {
    ...write,
    executeWrite: (tokenAddress: Address) => write.executeWrite([tokenAddress])
  }
}

// ============================================================================
// Deposit Functions - With Custom Query Invalidation
// ============================================================================

export function useDeposit() {
  const queryClient = useQueryClient()
  const teamStore = useTeamStore()
  const safeDepositRouterAddress = computed(() =>
    teamStore.getContractAddressByType('SafeDepositRouter')
  )

  const write = useSafeDepositRouterContractWrite({
    functionName: 'deposit'
  })

  // Override invalidateQueries for deposit-specific cache updates
  const originalInvalidateQueries = write.invalidateQueries
  write.invalidateQueries = async () => {
    await originalInvalidateQueries()

    // Invalidate SafeDepositRouter queries
    await queryClient.invalidateQueries({
      queryKey: ['readContract', { address: safeDepositRouterAddress.value }]
    })

    // Invalidate InvestorV1 queries (balance changes)
    await queryClient.invalidateQueries({
      queryKey: ['readContract', { address: teamStore.getContractAddressByType('InvestorV1') }]
    })
  }

  return {
    ...write,
    // Always skip gas estimation for deposit (multi-step operation with approval dependency)
    executeWrite: (tokenAddress: Address, amount: bigint) =>
      write.executeWrite([tokenAddress, amount], undefined, { skipGasEstimation: true })
  }
}

// UNUSED — no consumers outside safeDepositRouter.setup.ts.
/*
export function useDepositWithSlippage() {
  const queryClient = useQueryClient()
  const teamStore = useTeamStore()
  const safeDepositRouterAddress = computed(() =>
    teamStore.getContractAddressByType('SafeDepositRouter')
  )

  const write = useSafeDepositRouterContractWrite({
    functionName: 'depositWithSlippage'
  })

  const originalInvalidateQueries = write.invalidateQueries
  write.invalidateQueries = async () => {
    await originalInvalidateQueries()

    await queryClient.invalidateQueries({
      queryKey: ['readContract', { address: safeDepositRouterAddress.value }]
    })

    await queryClient.invalidateQueries({
      queryKey: ['readContract', { address: teamStore.getContractAddressByType('InvestorV1') }]
    })
  }

  return {
    ...write,
    executeWrite: (tokenAddress: Address, amount: bigint, minSherOut: bigint) =>
      write.executeWrite([tokenAddress, amount, minSherOut], undefined, { skipGasEstimation: true })
  }
}

export function useRecoverERC20() {
  const write = useSafeDepositRouterContractWrite({
    functionName: 'recoverERC20'
  })

  return {
    ...write,
    executeWrite: (tokenAddress: Address, amount: bigint) =>
      write.executeWrite([tokenAddress, amount])
  }
}
*/
