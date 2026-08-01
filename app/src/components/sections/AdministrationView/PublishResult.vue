<template>
  <UTooltip :text="archivedTooltip">
    <UButton
      color="primary"
      size="md"
      @click="handlePublishResults(electionId)"
      :loading="isPending"
      :disabled="isWriteDisabled"
      data-test="create-election-button"
      label="Publish Results"
    />
  </UTooltip>
</template>
<script lang="ts" setup>
import { electionsAbi } from '@/artifacts/abi/generated'
import { useTeamStore } from '@/stores'
import { classifyError, log } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useElectionsPublishResults } from '@/composables/elections/writes'
import { estimateGas } from '@wagmi/core'
import { type Address, encodeFunctionData } from 'viem'
import { computed } from 'vue'
import { config } from '@/wagmi.config'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const toast = useToast()
const queryClient = useQueryClient()
const { mutate: publishResults, isPending } = useElectionsPublishResults()
const teamStore = useTeamStore()
const electionsAddress = computed(() => {
  const address = teamStore.currentTeam?.teamContracts?.find((c) => c.type === 'Elections')?.address
  return address as Address
})
const { electionId } = defineProps<{
  electionId: number
}>()

const handlePublishResults = async (electionId: number) => {
  if (isWriteDisabled.value) return

  try {
    const data = encodeFunctionData({
      abi: electionsAbi,
      functionName: 'publishResults',
      args: [BigInt(electionId)]
    })
    await estimateGas(config, {
      to: electionsAddress.value,
      data
    })
  } catch (err) {
    log.error('Error estimating gas:', err)
    toast.add({ title: classifyError(err, { contract: 'Elections' }).userMessage, color: 'error' })
    return
  }

  publishResults(
    { args: [BigInt(electionId)] },
    {
      onSuccess: async () => {
        toast.add({ title: 'Election results published successfully!', color: 'success' })
        await queryClient.invalidateQueries({ queryKey: ['pastElections'] })
      },
      onError: (error) => {
        log.error('Error publishing results:', error)
        const classified = classifyError(error, { contract: 'Elections' })
        if (classified.category === 'user_rejected') return
        toast.add({ title: classified.userMessage, color: 'error' })
      }
    }
  )
}
</script>
