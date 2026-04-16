<template>
  <div class="space-y-4">
    <UButton
      color="primary"
      :loading="isBusy"
      :disabled="disable || isBusy"
      data-test="deploy-contracts-button"
      @click="onClick"
      :label="deployButtonText"
    />
  </div>
</template>

<script lang="ts" setup>
import type { Team } from '@/types'
import { computed } from 'vue'
import { useDeployOfficer, useInvalidateOfficerQueries } from '@/composables/contracts'
import { useCreateOfficerMutation } from '@/queries/contract.queries'
import { log } from '@/utils'

const props = withDefaults(
  defineProps<{
    investorContractInput: { name: string; symbol: string }
    createdTeamData: Partial<Team>
    disable?: boolean
  }>(),
  {
    disable: false
  }
)
const emits = defineEmits(['contractDeployed'])

const toast = useToast()

const deployMutation = useDeployOfficer()
const registerMutation = useCreateOfficerMutation()
const invalidateQueries = useInvalidateOfficerQueries()

const isBusy = computed(
  () => deployMutation.isPending.value || registerMutation.isPending.value
)

const deployButtonText = computed(() =>
  deployMutation.isPending.value ? 'Deploying Officer Contracts...' : 'Deploy Company Contracts'
)

const onClick = async () => {
  if (!props.createdTeamData?.id) {
    toast.add({ title: 'Team data not found', color: 'error' })
    return
  }
  const teamId = props.createdTeamData.id

  let metadata
  try {
    metadata = await deployMutation.mutateAsync({
      investorInput: props.investorContractInput,
      teamId
    })
  } catch {
    // Error toast already emitted by useDeployOfficer onError.
    return
  }

  try {
    await registerMutation.mutateAsync({
      body: {
        teamId,
        address: metadata.officerAddress,
        deployBlockNumber: metadata.deployBlockNumber,
        deployedAt: metadata.deployedAt.toISOString()
      }
    })
    await invalidateQueries(teamId)
    toast.add({ title: 'Officer contracts deployed and synced successfully', color: 'success' })
    emits('contractDeployed')
  } catch (error) {
    log.error('Error in post-deployment processing:', error)
    toast.add({ title: 'Failed to complete deployment setup', color: 'error' })
  }
}
</script>
