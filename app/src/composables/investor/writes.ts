import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { investorAbi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import { INVESTOR_PERMISSIONS_QUERY_KEY } from './permissions'

type InvestorFunctionNames = WriteFunctionName<typeof investorAbi>

function useInvestorContractWrite<F extends InvestorFunctionNames>(functionName: F) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getInvestorAddress())
  return useContractWritesV3({
    contractAddress,
    abi: investorAbi,
    functionName
  })
}

export function useIndividualMint() {
  return useInvestorContractWrite('individualMint')
}

export function useDistributeMint() {
  return useInvestorContractWrite('distributeMint')
}

function useInvestorPermissionWrite(functionName: 'grantRole' | 'revokeRole') {
  const teamStore = useTeamStore()
  const queryClient = useQueryClient()
  const contractAddress = computed(() => teamStore.getContractAddressByType('Investor'))

  return useContractWritesV3({
    contractAddress,
    abi: investorAbi,
    functionName,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [INVESTOR_PERMISSIONS_QUERY_KEY] })
  })
}

export function useGrantInvestorRole() {
  return useInvestorPermissionWrite('grantRole')
}

export function useRevokeInvestorRole() {
  return useInvestorPermissionWrite('revokeRole')
}
