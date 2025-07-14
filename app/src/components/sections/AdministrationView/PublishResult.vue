<template>
  <ButtonUI
    variant="primary"
    size="md"
    @click="handlePublishResults(electionId)"
    :loading="isPending || isWaiting"
    data-test="create-election-button"
  >
    Publish Results
  </ButtonUI>
</template>
<script lang="ts" setup>
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import ButtonUI from '@/components/ButtonUI.vue'
import { useTeamStore, useToastStore } from '@/stores'
import { log, parseError } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { estimateGas } from '@wagmi/core'
import { type Abi, type Address, encodeFunctionData } from 'viem'
import { computed, watch } from 'vue'
import { config } from '@/wagmi.config'

const toastStore = useToastStore()
const queryClient = useQueryClient()
const {
  writeContract: publishResults,
  isPending,
  error,
  data: publishResultsHash
} = useWriteContract()
const {
  error: waitError,
  isLoading: isWaiting,
  isSuccess: isPublished
} = useWaitForTransactionReceipt({
  hash: publishResultsHash
})
const teamStore = useTeamStore()
const electionsAddress = computed(() => {
  const address = teamStore.currentTeam?.teamContracts?.find((c) => c.type === 'Elections')?.address
  return address as Address
})
const { electionId } = defineProps<{
  electionId: number
}>()

const handlePublishResults = async (electionId: number) => {
  try {
    const data = encodeFunctionData({
      abi: ELECTIONS_ABI,
      functionName: 'publishResults',
      args: [BigInt(electionId)]
    })
    await estimateGas(config, {
      to: electionsAddress.value,
      data
    })
    publishResults({
      address: electionsAddress.value,
      abi: ELECTIONS_ABI,
      functionName: 'publishResults',
      args: [BigInt(electionId)]
    })
    await queryClient.invalidateQueries({
      queryKey: ['readContract', {}]
    })
  } catch (err) {
    toastStore.addErrorToast(parseError(err, ELECTIONS_ABI as Abi))
    log.error('Error creating election:', parseError(err, ELECTIONS_ABI as Abi))
  }
}

watch(error, (newError) => {
  if (newError) {
    console.error('Error publishing results:', parseError(newError))
    toastStore.addErrorToast('Failed to publish election results')
  }
})
watch(waitError, (newError) => {
  if (newError) {
    console.error('Error waiting for transaction receipt:', parseError(newError))
    toastStore.addErrorToast('Failed to wait for transaction receipt')
  }
})
watch(isPublished, async (success) => {
  if (success) {
    toastStore.addSuccessToast('Election results published successfully!')
    await queryClient.invalidateQueries({
      queryKey: ['boardOfDirectors']
    })
  }
})
</script>
