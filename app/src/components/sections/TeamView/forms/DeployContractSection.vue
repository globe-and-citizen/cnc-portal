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
import type { Address } from 'viem'
import { computed } from 'vue'
import { useOfficerDeployment } from '@/composables/contracts'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import { useSyncContractsMutation } from '@/queries/contract.queries'
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
const { mutateAsync: updateTeam, error: updateTeamError } = useUpdateTeamMutation()
const { mutateAsync: syncContracts, error: syncContractsError } = useSyncContractsMutation()

// Computed states
const deployButtonText = computed(() => {
  if (createOfficerLoading.value) {
    return 'Deploying Officer Contracts...'
  }
  return 'Deploy Company Contracts'
})

/**
 * Handle successful officer contract deployment
 */
const handleOfficerDeploymentSuccess = async (officerAddress: Address) => {
  if (!props.createdTeamData.id) {
    log.error('No Company data found')
    toast.add({ title: 'No company data found', color: 'error' })
    return
  }

  const teamId = props.createdTeamData.id

  try {
    // Update company with officer address
    await updateTeam({
      pathParams: { id: teamId },
      body: { officerAddress }
    })

    if (updateTeamError.value) {
      log.error('Error updating officer address')
      toast.add({ title: 'Error updating officer address', color: 'error' })
      return
    }

    // Sync contracts
    await syncContracts({ body: { teamId } })

    if (syncContractsError.value) {
      log.error('Error updating contracts')
      toast.add({ title: 'Error updating contracts', color: 'error' })
      return
    }

    // Invalidate queries
    await invalidateQueries(teamId)

    toast.add({ title: 'Officer contracts deployed and synced successfully', color: 'success' })
    log.info('Officer contracts deployment complete')

    // Notify parent that deployment is complete
    emits('contractDeployed')
  } catch (error) {
    log.error('Error in post-deployment processing:', error)
    toast.add({ title: 'Failed to complete deployment setup', color: 'error' })
  }
}

/**
 * Deploy officer contract and all sub-contracts
 */
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
