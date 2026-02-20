<template>
  <div class="space-y-4">
    <!-- Deploy Button with dynamic message -->
    <ButtonUI
      variant="primary"
      :loading="createOfficerLoading || isSafeDeploying"
      :disabled="disable || createOfficerLoading || isSafeDeploying"
      data-test="deploy-contracts-button"
      @click="deployOfficerContract"
    >
      {{ deployButtonText }}
    </ButtonUI>
  </div>
</template>

<script lang="ts" setup>
import { useUserDataStore } from '@/stores/user'
import ButtonUI from '@/components/ButtonUI.vue'
import { useToastStore } from '@/stores/useToastStore'
import type { Team } from '@/types'
import type { Address } from 'viem'
import { isAddress } from 'viem'
import { computed, onMounted } from 'vue'
import { useSafeDeployment } from '@/composables/safe'
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
const userDataStore = useUserDataStore()
const { addSuccessToast, addErrorToast } = useToastStore()

// Composables
const { deploySafe, isDeploying: isSafeDeploying } = useSafeDeployment()
const {
  isLoading: createOfficerLoading,
  deployOfficerContract: deployOfficer,
  watchDeploymentEvent,
  invalidateQueries
} = useOfficerDeployment()

// Mutations
const { mutateAsync: updateTeam, error: updateTeamError } = useUpdateTeamMutation()
const { mutateAsync: syncContracts, error: syncContractsError } = useSyncContractsMutation()

// Computed states

const deployButtonText = computed(() => {
  if (isSafeDeploying.value) {
    return 'Deploying Safe Wallet...'
  }
  if (createOfficerLoading.value) {
    return 'Deploying Officer Contracts...'
  }
  return 'Deploy Team Contracts'
})

/**
 * Deploy Safe wallet for the team
 */
const deploySafeForTeam = async () => {
  if (!props.createdTeamData?.id) {
    addErrorToast('Team data not found')
    return
  }

  const currentUserAddress = userDataStore.address

  if (!currentUserAddress || !isAddress(currentUserAddress)) {
    addErrorToast('Invalid wallet address. Please connect your wallet.')
    return
  }

  try {
    const safeAddress = await deploySafe([currentUserAddress], 1)

    await updateTeam({
      pathParams: { id: props.createdTeamData.id! },
      body: { safeAddress: (safeAddress ?? undefined) as `0x${string}` | undefined }
    })

    addSuccessToast('Safe wallet deployed successfully')
    emits('contractDeployed')
  } catch (error) {
    log.error('Error deploying Safe:', error)
    addErrorToast('Failed to deploy Safe wallet. Please try again.')
  }
}

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

    // Invalidate queries (pass teamId which can be string or number)
    await invalidateQueries(teamId)

    addSuccessToast('Officer contracts synced successfully')
    log.info('Officer contracts synced successfully')

    // Deploy Safe wallet
    await deploySafeForTeam()
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

// Watch for deployment events
onMounted(() => {
  watchDeploymentEvent(handleOfficerDeploymentSuccess)
})
</script>
