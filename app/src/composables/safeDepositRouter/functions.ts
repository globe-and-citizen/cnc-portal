import { parseUnits, type Address } from 'viem'
import { useSafeDepositRouterWrites } from './writes'
import { SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES } from './types'
import { computed, unref } from 'vue'

/**
 * SafeDepositRouter contract write functions
 */
export function useSafeDepositRouterFunctions() {
  const writes = useSafeDepositRouterWrites()

  const functionName =
    'value' in writes.currentFunctionName
      ? writes.currentFunctionName
      : computed(() => unref(writes.currentFunctionName))

  const isLoading =
    'value' in writes.isLoading ? writes.isLoading : computed(() => unref(writes.isLoading))

  const isConfirmed =
    'value' in writes.isConfirmed ? writes.isConfirmed : computed(() => unref(writes.isConfirmed))

  // ============================================================================
  // Admin Functions
  // ============================================================================

  const enableDeposits = () =>
    writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.ENABLE_DEPOSITS)

  const disableDeposits = () =>
    writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.DISABLE_DEPOSITS)

  const pauseContract = () => writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.PAUSE)

  const unpauseContract = () => writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.UNPAUSE)

  const transferOwnership = (newOwner: Address) =>
    writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.TRANSFER_OWNERSHIP, [newOwner])

  const renounceOwnership = () =>
    writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.RENOUNCE_OWNERSHIP)

  // ============================================================================
  // Configuration Functions
  // ============================================================================

  const setSafeAddress = (newSafeAddress: Address) =>
    writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.SET_SAFE_ADDRESS, [newSafeAddress])

  const setInvestorAddress = (newInvestorAddress: Address) =>
    writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.SET_INVESTOR_ADDRESS, [
      newInvestorAddress
    ])

  const setMultiplier = (newMultiplier: number | bigint) => {
    const multiplierValue =
      typeof newMultiplier === 'number' ? BigInt(newMultiplier) : newMultiplier
    return writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.SET_MULTIPLIER, [multiplierValue])
  }

  const addTokenSupport = (tokenAddress: Address) =>
    writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.ADD_TOKEN_SUPPORT, [tokenAddress])

  const removeTokenSupport = (tokenAddress: Address) =>
    writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.REMOVE_TOKEN_SUPPORT, [tokenAddress])

  // ============================================================================
  // Deposit Functions
  // ============================================================================

  const deposit = (tokenAddress: Address, amount: string, decimals: number = 18) => {
    const amountInWei = parseUnits(amount, decimals)
    return writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.DEPOSIT, [
      tokenAddress,
      amountInWei
    ])
  }

  const depositWithSlippage = (
    tokenAddress: Address,
    amount: string,
    minSherOut: string,
    decimals: number = 18
  ) => {
    const amountInWei = parseUnits(amount, decimals)
    const minSherOutInWei = parseUnits(minSherOut, 18) // SHER is always 18 decimals
    return writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.DEPOSIT_WITH_SLIPPAGE, [
      tokenAddress,
      amountInWei,
      minSherOutInWei
    ])
  }

  // ============================================================================
  // Recovery Functions
  // ============================================================================

  const recoverERC20 = (tokenAddress: Address, amount: string, decimals: number = 18) => {
    const amountInWei = parseUnits(amount, decimals)
    return writes.executeWrite(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES.RECOVER_ERC20, [
      tokenAddress,
      amountInWei
    ])
  }

  return {
    // State
    safeDepositRouterAddress: writes.safeDepositRouterAddress,
    currentFunctionName: functionName,
    isLoading,
    isConfirmed,
    hash: writes.hash,
    error: writes.error,
    receipt: writes.receipt,

    // Admin functions
    enableDeposits,
    disableDeposits,
    pauseContract,
    unpauseContract,
    transferOwnership,
    renounceOwnership,

    // Configuration functions
    setSafeAddress,
    setInvestorAddress,
    setMultiplier,
    addTokenSupport,
    removeTokenSupport,

    // Deposit functions
    deposit,
    depositWithSlippage,

    // Recovery functions
    recoverERC20,

    // Helpers
    reset: writes.reset
  }
}
