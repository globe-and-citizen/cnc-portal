<template>
  <div class="space-y-4">
    <!-- Deploy Button with dynamic message -->
    <UButton
      color="primary"
      :loading="createOfficerLoading"
      :disabled="disable || createOfficerLoading"
      data-test="deploy-contracts-button"
      @click="deployOfficerContract"
      :label="deployButtonText"
    />
  </div>
</template>

<script lang="ts" setup>
import type { Team } from '@/types'
import { computed } from 'vue'
import { useOfficerDeployment } from '@/composables/contracts'
import type { OfficerDeploymentMetadata } from '@/composables/contracts/useOfficerDeployment'
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

// Stores
const toast = useToast()

// Composables
const {
  isLoading: createOfficerLoading,
  deployOfficerContract: deployOfficer,
  invalidateQueries
} = useOfficerDeployment()

// Mutations
const { mutateAsync: registerOfficer } = useCreateOfficerMutation()

// Computed states
const deployButtonText = computed(() => {
  if (createOfficerLoading.value) {
    return 'Deploying Officer Contracts...'
  }
  return 'Deploy Company Contracts'
})

const handleOfficerDeploymentSuccess = async (metadata: OfficerDeploymentMetadata) => {
  if (!props.createdTeamData.id) {
    log.error('No Company data found')
    toast.add({ title: 'No company data found', color: 'error' })
    return
  }

  const teamId = props.createdTeamData.id

  try {
    await registerOfficer({
      body: {
        teamId,
        address: metadata.officerAddress,
        deployBlockNumber: metadata.deployBlockNumber,
        deployedAt: metadata.deployedAt.toISOString()
      }
    })

    await invalidateQueries(teamId)

    toast.add({ title: 'Officer contracts deployed and synced successfully', color: 'success' })
    log.info('Officer contracts deployment complete')

    emits('contractDeployed')
  } catch (error) {
    log.error('Error in post-deployment processing:', error)
    toast.add({ title: 'Failed to complete deployment setup', color: 'error' })
  }
}

const deployOfficerContract = async () => {
  if (!props.createdTeamData?.id) {
    toast.add({ title: 'Team data not found', color: 'error' })
    return
  }

  await deployOfficer({
    investorInput: props.investorContractInput,
    onDeploymentComplete: handleOfficerDeploymentSuccess
  })
}
</script>
