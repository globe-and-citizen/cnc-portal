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
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { useTeamStore } from '@/stores'
import { log, parseError } from '@/utils'
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
      abi: ELECTIONS_ABI,
      functionName: 'publishResults',
      args: [BigInt(electionId)]
    })
    await estimateGas(config, {
      to: electionsAddress.value,
      data
    })
  } catch (err) {
    toast.add({ title: parseError(err, ELECTIONS_ABI), color: 'error' })
    log.error('Error estimating gas:', parseError(err, ELECTIONS_ABI))
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
        console.error('Error publishing results:', parseError(error))
        toast.add({ title: 'Failed to publish election results', color: 'error' })
      }
    }
  )
}
</script>
