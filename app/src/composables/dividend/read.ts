import { computed } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address } from 'viem'
import { useTeamStore } from '@/stores'
import { DS_FUNCTION_NAMES } from './types'
import { DIVIDEND_SPLITTER_ABI } from '@/artifacts/abi/dividend-splitter'

export function useDividendSplitterReads() {
  const teamStore = useTeamStore()
  const dsAddress = computed(() => teamStore.getContractAddressByType('DividendSplitter'))
  const isValid = computed(() => !!dsAddress.value && isAddress(dsAddress.value))

  const useDsPaused = () =>
    useReadContract({
      address: dsAddress.value,
      abi: DIVIDEND_SPLITTER_ABI,
      functionName: DS_FUNCTION_NAMES.PAUSED,
      query: { enabled: isValid }
    })

  const useDsOwner = () =>
    useReadContract({
      address: dsAddress.value,
      abi: DIVIDEND_SPLITTER_ABI,
      functionName: DS_FUNCTION_NAMES.OWNER,
      query: { enabled: isValid }
    })

  const useDsInvestor = () =>
    useReadContract({
      address: dsAddress.value,
      abi: DIVIDEND_SPLITTER_ABI,
      functionName: DS_FUNCTION_NAMES.INVESTOR,
      query: { enabled: isValid }
    })

  const useDsInvestorSet = () =>
    useReadContract({
      address: dsAddress.value,
      abi: DIVIDEND_SPLITTER_ABI,
      functionName: DS_FUNCTION_NAMES.INVESTOR_SET,
      query: { enabled: isValid }
    })

  const useDsReleasable = (account: Address) =>
    useReadContract({
      address: dsAddress.value,
      abi: DIVIDEND_SPLITTER_ABI,
      functionName: DS_FUNCTION_NAMES.RELEASABLE,
      args: [account],
      query: { enabled: computed(() => isValid.value && isAddress(account)) }
    })

  const useDsPending = (account: Address) =>
    useReadContract({
      address: dsAddress.value,
      abi: DIVIDEND_SPLITTER_ABI,
      functionName: DS_FUNCTION_NAMES.PENDING,
      args: [account],
      query: { enabled: computed(() => isValid.value && isAddress(account)) }
    })

  const useDsReleased = (account: Address) =>
    useReadContract({
      address: dsAddress.value,
      abi: DIVIDEND_SPLITTER_ABI,
      functionName: DS_FUNCTION_NAMES.RELEASED,
      args: [account],
      query: { enabled: computed(() => isValid.value && isAddress(account)) }
    })

  const useDsTotalAllocated = () =>
    useReadContract({
      address: dsAddress.value,
      abi: DIVIDEND_SPLITTER_ABI,
      functionName: DS_FUNCTION_NAMES.TOTAL_ALLOCATED,
      query: { enabled: isValid }
    })

  const useDsTotalReleased = () =>
    useReadContract({
      address: dsAddress.value,
      abi: DIVIDEND_SPLITTER_ABI,
      functionName: DS_FUNCTION_NAMES.TOTAL_RELEASED,
      query: { enabled: isValid }
    })

  return {
    dsAddress,
    isValid,
    useDsPaused,
    useDsOwner,
    useDsInvestor,
    useDsInvestorSet,
    useDsReleasable,
    useDsPending,
    useDsReleased,
    useDsTotalAllocated,
    useDsTotalReleased
  }
}
