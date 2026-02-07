import { computed, unref, type MaybeRef } from 'vue'
import type { Address } from 'viem'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import { useTeamStore } from '@/stores'
import type { ExtractAbiFunctionNames } from 'abitype'

type InvestorFunctionNames = ExtractAbiFunctionNames<typeof INVESTOR_ABI>

// Helper function to wrap useContractWrites for InvestorV1 contract
export function useInvestorContractWrite(options: {
  functionName: InvestorFunctionNames
  args?: MaybeRef<readonly unknown[]>
  value?: MaybeRef<bigint>
}) {
  const teamStore = useTeamStore()
  const investorAddress = computed(() => teamStore.getContractAddressByType('InvestorV1'))

  return useContractWrites({
    contractAddress: investorAddress,
    abi: INVESTOR_ABI,
    functionName: options.functionName,
    args: options.args ?? [],
    ...(options.value !== undefined ? { value: options.value } : {})
  })
}

export function useIndividualMint(shareholder: MaybeRef<Address>, amount: MaybeRef<bigint>) {
  const args = computed(() => [unref(shareholder), unref(amount)] as readonly unknown[])
  return useInvestorContractWrite({ functionName: 'individualMint', args })
}

export function useDistributeMint(shareholders: MaybeRef<readonly { shareholder: Address; amount: bigint }[]>) {
  const args = computed(() => [unref(shareholders)] as readonly unknown[])
  return useInvestorContractWrite({ functionName: 'distributeMint', args })
}

export function useTransfer(to: MaybeRef<Address>, amount: MaybeRef<bigint>) {
  const args = computed(() => [unref(to), unref(amount)] as readonly unknown[])
  return useInvestorContractWrite({ functionName: 'transfer', args })
}

export function usePause() {
  return useInvestorContractWrite({ functionName: 'pause', args: [] })
}

export function useUnpause() {
  return useInvestorContractWrite({ functionName: 'unpause', args: [] })
}

export function useInitialize(name: MaybeRef<string>, symbol: MaybeRef<string>, owner: MaybeRef<Address>) {
  const args = computed(() => [unref(name), unref(symbol), unref(owner)] as readonly unknown[])
  return useInvestorContractWrite({ functionName: 'initialize', args })
}

export function useTransferOwnership(newOwner: MaybeRef<Address>) {
  return useInvestorContractWrite({ functionName: 'transferOwnership', args: [newOwner] })
}

export function useRenounceOwnership() {
  return useInvestorContractWrite({ functionName: 'renounceOwnership', args: [] })
}
