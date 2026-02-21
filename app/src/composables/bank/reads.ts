import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address, zeroAddress } from 'viem'
import { readContracts } from '@wagmi/core'
import { useQuery } from '@tanstack/vue-query'
import { useTeamStore } from '@/stores'
import { BANK_FUNCTION_NAMES } from './types'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { SUPPORTED_TOKENS } from '@/constant/index'
import { config } from '@/wagmi.config'

/**
 * Bank contract address helper
 */
export function useBankAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('Bank'))
}

/**
 * Bank contract read operations (mirrors the style of ERC20 reads)
 */
export function useBankPaused() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.PAUSED,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

export function useBankOwner() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.OWNER,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

export function useBankSupportedTokens() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.SUPPORTED_TOKENS,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

export function useDividendBalance(address: MaybeRef<Address>) {
  const bankAddress = useBankAddress()

  const addressValue = computed(() => unref(address))

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.DIVIDEND_BALANCES,
    args: [addressValue],
    query: {
      enabled: computed(
        () => !!bankAddress.value && isAddress(bankAddress.value) && isAddress(addressValue.value)
      )
    }
  })
}

export function useTokenDividendBalance(
  tokenAddress: MaybeRef<Address>,
  address: MaybeRef<Address>
) {
  const bankAddress = useBankAddress()

  const tokenValue = computed(() => unref(tokenAddress))
  const addressValue = computed(() => unref(address))

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.TOKEN_DIVIDEND_BALANCES,
    args: [tokenValue, addressValue],
    query: {
      enabled: computed(
        () =>
          !!bankAddress.value &&
          isAddress(bankAddress.value) &&
          isAddress(tokenValue.value) &&
          isAddress(addressValue.value)
      )
    }
  })
}

export function useTotalDividend() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.TOTAL_DIVIDEND,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

export function useUnlockedBalance() {
  const bankAddress = useBankAddress()

  return useReadContract({
    address: bankAddress,
    abi: BANK_ABI,
    functionName: BANK_FUNCTION_NAMES.GET_UNLOCK_BALANCE,
    query: { enabled: !!bankAddress.value && isAddress(bankAddress.value) }
  })
}

/**
 * Fetch dividend balances for all supported tokens
 * Uses readContracts to batch read operations for better performance
 *
 * For native token: uses dividendBalances function
 * For ERC20 tokens: uses tokenDividendBalances function
 */
export function useGetDividendBalances(userAddress: MaybeRef<Address>) {
  const bankAddress = useBankAddress()
  const addressValue = computed(() => unref(userAddress))

  return useQuery({
    queryKey: computed(() => [
      'bank',
      'dividendBalances',
      bankAddress.value,
      addressValue.value
    ] as const),
    enabled: computed(
      () =>
        !!bankAddress.value &&
        isAddress(bankAddress.value) &&
        !!addressValue.value &&
        isAddress(addressValue.value)
    ),
    queryFn: async () => {
      const bank = bankAddress.value
      const user = addressValue.value

      if (!bank || !isAddress(bank) || !user || !isAddress(user)) {
        throw new Error('Invalid bank address or user address')
      }

      // Build contract calls for each supported token
      const contracts = SUPPORTED_TOKENS.map((token) => {
        // For native token (zero address), use dividendBalances
        // For ERC20 tokens, use tokenDividendBalances
        const isNative = token.address === zeroAddress

        return {
          address: bank,
          abi: BANK_ABI,
          functionName: isNative
            ? BANK_FUNCTION_NAMES.DIVIDEND_BALANCES
            : BANK_FUNCTION_NAMES.TOKEN_DIVIDEND_BALANCES,
          args: isNative ? [user] : [token.address, user]
        } as const
      })

      // Execute all reads in a single batch call
      const results = await readContracts(config, { contracts })

      // Map results back to tokens with their balances
      return SUPPORTED_TOKENS.map((token, index) => {
        const result = results[index]

        // Handle undefined results
        if (!result) {
          return {
            token,
            balance: 0n,
            error: new Error('No result returned') as Error
          }
        }

        // Handle success and failure cases
        if (result.status === 'success') {
          return {
            token,
            balance: (result.result as bigint) || 0n,
            error: null
          }
        }

        // Handle failure case
        return {
          token,
          balance: 0n,
          error: result.error as Error
        }
      })
    },
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000 // 1 minute
  })
}
