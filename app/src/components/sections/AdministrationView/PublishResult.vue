<template>
  <UButton
    color="primary"
    size="md"
    @click="handlePublishResults(electionId)"
    :loading="isPending || isWaiting"
    data-test="create-election-button"
    label="Publish Results"
  />
</template>
<script lang="ts" setup>
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { useTeamStore } from '@/stores'
import { log, parseError } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { estimateGas } from '@wagmi/core'
import { type Address, encodeFunctionData } from 'viem'
import { computed, watch } from 'vue'
import { config } from '@/wagmi.config'

const toast = useToast()
const queryClient = useQueryClient()
const { mutate: publishResults, isPending, error, data: publishResultsHash } = useWriteContract()
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
  } catch (err) {
    toast.add({ title: parseError(err, ELECTIONS_ABI), color: 'error' })
    log.error('Error creating election:', parseError(err, ELECTIONS_ABI))
  }
}

watch(error, (newError) => {
  if (newError) {
    console.error('Error publishing results:', parseError(newError))
    toast.add({ title: 'Failed to publish election results', color: 'error' })
  }
})
watch(waitError, (newError) => {
  if (newError) {
    console.error('Error waiting for transaction receipt:', parseError(newError))
    toast.add({ title: 'Failed to wait for transaction receipt', color: 'error' })
  }
})
watch(isPublished, async (success) => {
  if (success) {
    toast.add({ title: 'Election results published successfully!', color: 'success' })
    await queryClient.invalidateQueries({
      queryKey: ['readContract']
    })
    await queryClient.invalidateQueries({ queryKey: ['pastElections'] })
  }
})
</script>
