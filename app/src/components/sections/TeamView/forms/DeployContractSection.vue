<template>
  <div class="space-y-4">
    <UAlert
      v-if="deployMutation.error.value"
      color="error"
      variant="soft"
      icon="i-heroicons-x-circle"
      title="Officer deploy failed"
      :description="formatDeployError(deployMutation.error.value)"
      data-test="deploy-error-alert"
    />

    <UAlert
      v-if="registerMutation.error.value"
      color="error"
      variant="soft"
      icon="i-heroicons-x-circle"
      title="Failed to complete deployment setup"
      :description="registerMutation.error.value.message"
      data-test="register-error-alert"
    />

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
import {
  useDeployOfficer,
  useInvalidateOfficerQueries,
  formatDeployError
} from '@/composables/contracts'
import { useCreateOfficerMutation } from '@/queries/contract.queries'

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

const isBusy = computed(() => deployMutation.isPending.value || registerMutation.isPending.value)

const deployButtonText = computed(() =>
  deployMutation.isPending.value ? 'Deploying Officer Contracts...' : 'Deploy Company Contracts'
)

const onClick = async () => {
  if (!props.createdTeamData?.id) {
    toast.add({ title: 'Team data not found', color: 'error' })
    return
  }
  const teamId = props.createdTeamData.id

  // Errors remain on the mutation refs so the UAlerts above render them.
  const metadata = await deployMutation
    .mutateAsync({ investorInput: props.investorContractInput, teamId })
    .catch(() => null)
  if (!metadata) return

  const registered = await registerMutation
    .mutateAsync({
      body: {
        teamId,
        address: metadata.officerAddress,
        deployBlockNumber: metadata.deployBlockNumber,
        deployedAt: metadata.deployedAt.toISOString()
      }
    })
    .catch(() => null)
  if (!registered) return

  await invalidateQueries(teamId)
  toast.add({ title: 'Officer contracts deployed and synced successfully', color: 'success' })
  emits('contractDeployed')
}
</script>
