<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Hex } from 'viem'
import { useDeployContract } from '@/composables/useContractFunctions'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import { adCampaignManagerAbi } from '@/artifacts/abi/generated'
import { CAMPAIGN_BYTECODE } from '@/artifacts/bytecode/adCampaignManager'
import { useCreateContractMutation } from '@/queries/contract.queries'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { formatToken } from '@/utils/format'

const emit = defineEmits(['closeAddCampaignModal'])
const toast = useToast()
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const bankAddress = teamStore.getContractAddressByType('Bank')
const campaignBytecode = CAMPAIGN_BYTECODE as Hex

const formState = reactive({
  bankAddress: bankAddress ?? '',
  costPerClick: '',
  costPerImpression: ''
})

const positiveAmount = z.preprocess(
  (value) => (value == null ? '' : String(value)),
  z
    .string()
    .trim()
    .min(1, 'Required')
    .refine((value) => /^(?:\d+\.?\d*|\.\d+)$/.test(value), 'Enter a valid amount')
    .refine((value) => Number(value) > 0, 'Must be greater than 0')
)
const formSchema = z.object({
  bankAddress: z.string().optional(),
  costPerClick: positiveAmount,
  costPerImpression: positiveAmount
})
type CampaignFormSchema = z.output<typeof formSchema>

const submissionError = ref<string | null>(
  formState.bankAddress ? null : 'A Bank contract is required before setting up the manager.'
)
const bankMissing = computed(() => !formState.bankAddress)
const {
  deploy,
  isDeploying,
  contractAddress,
  error: deployError
} = useDeployContract(adCampaignManagerAbi, campaignBytecode)
const createContract = useCreateContractMutation()
const loading = computed(() => isDeploying.value || createContract.isPending.value)
const errorMessage = computed(() => {
  if (submissionError.value) return submissionError.value
  const error = deployError.value ?? createContract.error.value
  if (!error) return null
  const message =
    (error as { shortMessage?: string; message?: string }).shortMessage ?? error.message
  return message?.includes('User rejected the request')
    ? 'The wallet transaction was rejected.'
    : (message ?? 'Campaign Manager setup failed. Please retry.')
})

const rateSummary = computed(() => [
  {
    label: 'Per click',
    value: formState.costPerClick ? formatToken(formState.costPerClick, 'POL') : 'Not set'
  },
  {
    label: 'Per impression',
    value: formState.costPerImpression ? formatToken(formState.costPerImpression, 'POL') : 'Not set'
  }
])

watch(contractAddress, (newAddress) => {
  if (!newAddress || !teamStore.currentTeam) return
  createContract.mutate(
    {
      body: {
        teamId: String(teamStore.currentTeam.id),
        contractAddress: newAddress,
        contractType: 'Campaign',
        deployer: userDataStore.address
      }
    },
    {
      onSuccess: () => {
        toast.add({ title: 'Campaign Manager is ready', color: 'success' })
        emit('closeAddCampaignModal')
      },
      onError: () => {
        toast.add({
          title: 'The manager was deployed but could not be added to the company',
          description: 'Retry the registration before deploying another manager.',
          color: 'error'
        })
      }
    }
  )
})

function deployCampaignManager(event: FormSubmitEvent<CampaignFormSchema>) {
  if (!event.data.bankAddress) {
    submissionError.value = 'A Bank contract is required before setting up the manager.'
    return
  }
  submissionError.value = null
  deploy(event.data.bankAddress, event.data.costPerClick, event.data.costPerImpression)
}

function viewContractCode() {
  window.open(
    'https://github.com/globe-and-citizen/cnc-portal/blob/develop/contract/contracts/AdCampaignManager.sol',
    '_blank'
  )
}
</script>

<template>
  <UForm :schema="formSchema" :state="formState" class="space-y-5" @submit="deployCampaignManager">
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-route"
      title="One-time company setup"
      description="The manager defines the rates used by every advertising campaign. Each advertiser chooses and funds their own campaign budget afterward."
    />

    <div class="space-y-3">
      <div class="flex gap-3">
        <UBadge color="primary" variant="subtle">1</UBadge>
        <div>
          <p class="text-highlighted text-sm font-medium">Configure rates</p>
          <p class="text-muted text-xs">Set the unit price for validated clicks and impressions.</p>
        </div>
      </div>
      <div class="flex gap-3">
        <UBadge color="neutral" variant="subtle">2</UBadge>
        <div>
          <p class="text-highlighted text-sm font-medium">Confirm deployment</p>
          <p class="text-muted text-xs">Your wallet deploys one Campaign Manager contract.</p>
        </div>
      </div>
      <div class="flex gap-3">
        <UBadge color="neutral" variant="subtle">3</UBadge>
        <div>
          <p class="text-highlighted text-sm font-medium">Create funded campaigns</p>
          <p class="text-muted text-xs">The campaign workspace becomes available immediately.</p>
        </div>
      </div>
    </div>

    <div class="border-default rounded-lg border p-3">
      <p class="text-muted text-xs">Advertising revenue destination</p>
      <div v-if="formState.bankAddress" class="mt-1">
        <AddressToolTip :address="formState.bankAddress" :slice="false" />
      </div>
      <p v-else class="text-error mt-1 text-sm">No Bank contract configured</p>
      <input v-model="formState.bankAddress" type="hidden" data-testid="bank-address-input" />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField
        name="costPerClick"
        label="Cost per click"
        help="Charged for each validated click."
        required
      >
        <UInput
          v-model="formState.costPerClick"
          type="number"
          min="0"
          step="any"
          class="w-full"
          placeholder="0.00"
        >
          <template #trailing><span class="text-muted text-xs">POL</span></template>
        </UInput>
      </UFormField>

      <UFormField
        name="costPerImpression"
        label="Cost per impression"
        help="Charged for each validated impression."
        required
      >
        <UInput
          v-model="formState.costPerImpression"
          type="number"
          min="0"
          step="any"
          class="w-full"
          placeholder="0.00"
        >
          <template #trailing><span class="text-muted text-xs">POL</span></template>
        </UInput>
      </UFormField>
    </div>

    <dl class="bg-elevated grid grid-cols-2 gap-3 rounded-lg p-3 text-sm">
      <div v-for="rate in rateSummary" :key="rate.label">
        <dt class="text-muted">{{ rate.label }}</dt>
        <dd class="text-highlighted mt-1 font-medium">{{ rate.value }}</dd>
      </div>
    </dl>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Campaign Manager setup needs attention"
      :description="errorMessage"
      data-test="deploy-error-alert"
    />

    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      <UButton
        color="neutral"
        variant="link"
        icon="i-lucide-code-2"
        label="Review contract source"
        @click="viewContractCode"
      />
      <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
        <UButton
          color="primary"
          type="submit"
          icon="i-lucide-rocket"
          :loading="loading"
          :disabled="loading || bankMissing || archivedDisabled"
          data-test="confirm-button"
          label="Deploy Campaign Manager"
        />
      </TeamArchivedTooltip>
    </div>
  </UForm>
</template>
