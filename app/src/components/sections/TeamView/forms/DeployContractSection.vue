<template>
  <div class="space-y-4">
    <!-- Deploy Button with dynamic message -->
    <ButtonUI
      variant="primary"
      :loading="createOfficerLoading"
      :disabled="disable || createOfficerLoading"
      data-test="deploy-contracts-button"
      @click="deployOfficerContract"
    >
      {{ deployButtonText }}
    </ButtonUI>
  </div>
</template>

<script lang="ts" setup>
import ButtonUI from '@/components/ButtonUI.vue'
import { useToastStore } from '@/stores/useToastStore'
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
const { addSuccessToast, addErrorToast } = useToastStore()

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
  return 'Deploy Team Contracts'
})

/**
 * Handle successful officer contract deployment
 */
const handleOfficerDeploymentSuccess = async (officerAddress: Address) => {
  if (!props.createdTeamData.id) {
    log.error('No team data found')
    addErrorToast('No team data found')
    return
  }

  const teamId = props.createdTeamData.id

  try {
    // Update team with officer address
    await updateTeam({
      pathParams: { id: teamId },
      body: { officerAddress }
    })

    if (updateTeamError.value) {
      log.error('Error updating officer address')
      addErrorToast('Error updating officer address')
      return
    }

    // Sync contracts
    await syncContracts({ body: { teamId } })

    if (syncContractsError.value) {
      log.error('Error updating contracts')
      addErrorToast('Error updating contracts')
      return
    }

    // Invalidate queries
    await invalidateQueries(teamId)

    addSuccessToast('Officer contracts deployed and synced successfully')
    log.info('Officer contracts deployment complete')

    // Notify parent that deployment is complete
    emits('contractDeployed')
  } catch (error) {
    log.error('Error in post-deployment processing:', error)
    addErrorToast('Failed to complete deployment setup')
  }
}

/**
 * Deploy officer contract and all sub-contracts
 */
const deployOfficerContract = async () => {
  if (!props.createdTeamData?.id) {
    addErrorToast('Team data not found')
    return
  }

  await deployOfficer({
    investorInput: props.investorContractInput,
    onDeploymentComplete: handleOfficerDeploymentSuccess
  })
}
</script>
