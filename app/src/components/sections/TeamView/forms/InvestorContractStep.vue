<template>
  <UForm :schema="investorSchema" :state="investorContractInput" class="flex flex-col gap-5">
    <UAlert
      v-if="showAlert && team?.name"
      color="success"
      icon="i-heroicons-check-circle"
      :title="`Company &quot;${team.name}&quot; created! To use CNC features, deploy all your company contracts in one action.`"
      class="mb-2"
    />
    <div class="mb-2 text-sm text-gray-700">
      Start by filling in the required investor contract values below. You can skip this and come
      back later.
    </div>
    <UFormField
      label="Share Name"
      name="name"
      required
      help="Full name of the share token (e.g. Company SHER)"
    >
      <UInput
        v-model="investorContractInput.name"
        placeholder="Company SHER"
        class="w-full"
        data-test="share-name-input"
      />
    </UFormField>
    <UFormField label="Symbol" name="symbol" required help="Short ticker symbol (e.g. SHR, COMP)">
      <UInput
        v-model="investorContractInput.symbol"
        placeholder="SHR"
        class="w-full"
        data-test="share-symbol-input"
      />
    </UFormField>
    <div class="mt-6 flex justify-between">
      <UButton
        v-if="showSkip"
        color="neutral"
        variant="ghost"
        class="justify-center"
        data-test="skip-button"
        @click="$emit('skip')"
      >
        Skip for now
      </UButton>

      <div class="space-y-4">

        <UButton
          color="primary"
          :loading="isBusy"
          :disabled="!canDeploy || isBusy"
          data-test="deploy-contracts-button"
          @click="onClick"
          :label="deployButtonText"
        />
      </div>
    </div>
    <div>
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
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import type { Team } from '@/types'
import {
  useDeployOfficer,
  useInvalidateOfficerQueries,
  formatDeployError
} from '@/composables/contracts'
import { useCreateOfficerMutation } from '@/queries/contract.queries'

const props = withDefaults(
  defineProps<{
    team: Partial<Team & {}>
    showAlert?: boolean
    showSkip?: boolean
  }>(),
  {
    showAlert: false,
    showSkip: false
  }
)

const emits = defineEmits(['skip', 'contractDeployed'])

const toast = useToast()

const deployMutation = useDeployOfficer()
const registerMutation = useCreateOfficerMutation()
const invalidateQueries = useInvalidateOfficerQueries()

const isBusy = computed(() => deployMutation.isPending.value || registerMutation.isPending.value)

const deployButtonText = computed(() =>
  deployMutation.isPending.value ? 'Deploying Officer Contracts...' : 'Deploy Company Contracts'
)


const investorSchema = z.object({
  name: z.string().min(1, 'Share name is required'),
  symbol: z.string().min(1, 'Symbol is required')
})

const investorContractInput = ref({
  name: '',
  symbol: ''
})

const canDeploy = computed(
  () => !!investorContractInput.value.name && !!investorContractInput.value.symbol
)
const onClick = async () => {
  if (!props.team?.id) {
    toast.add({ title: 'Team data not found', color: 'error' })
    return
  }
  const teamId = props.team.id

  // Errors remain on the mutation refs so the UAlerts above render them.
  const metadata = await deployMutation
    .mutateAsync({ investorInput: investorContractInput.value, teamId })
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
  if (!registered) return

  await invalidateQueries(teamId)
  toast.add({ title: 'Officer contracts deployed and synced successfully', color: 'success' })
  emits('contractDeployed')
}
</script>
