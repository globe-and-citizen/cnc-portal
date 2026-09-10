<template>
  <UTooltip :text="tooltip">
    <UButton
      color="primary"
      size="md"
      @click="handlePublishResults(electionId)"
      :loading="isPending"
      :disabled="isPublishDisabled"
      data-test="publish-results-button"
      label="Publish Results"
    />
  </UTooltip>
</template>
<script lang="ts" setup>
import { electionsAbi } from '@/artifacts/abi/generated'
import { classifyError } from '@/utils/errors/classifyContractError'
import { log } from '@/lib/logging'
import { useElectionsAddress, useElectionsPublishResults } from '@/composables/elections'
import { estimateGas } from '@wagmi/core'
import { encodeFunctionData } from 'viem'
import { computed } from 'vue'
import { config } from '@/wagmi.config'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const toast = useToast()
const { mutate: publishResults, isPending } = useElectionsPublishResults()
const electionsAddress = useElectionsAddress()
const {
  electionId,
  disabled = false,
  disabledReason
} = defineProps<{
  electionId: number
  // Set by the caller when this viewer may not publish — the reason is shown
  // instead of leaving a dead button with no explanation.
  disabled?: boolean
  disabledReason?: string
}>()

const isPublishDisabled = computed(() => isWriteDisabled.value || disabled)

const tooltip = computed(() => {
  if (archivedTooltip.value) return archivedTooltip.value
  if (disabled) return disabledReason
  return undefined
})

const handlePublishResults = async (electionId: number) => {
  if (isPublishDisabled.value) return

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
      onSuccess: () => {
        toast.add({ title: 'Election results published successfully!', color: 'success' })
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
