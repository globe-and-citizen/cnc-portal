// import { useWriteContract } from "@wagmi/vue";
// import type { Address } from "viem";
import { computed, type MaybeRef } from "vue";
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useContractWrites } from "@/composables/contracts/useContractWritesV2";
import { useTeamStore } from "@/stores/teamStore";

export function useDepositToken(amount: MaybeRef<bigint>) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: "depositToken",
    args: [amount]
  })
}

export function usePause() {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: "pause",
    args: []
  })
}

export function useUnpause() {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWrites({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName: "unpause",
    args: []
  })
}
