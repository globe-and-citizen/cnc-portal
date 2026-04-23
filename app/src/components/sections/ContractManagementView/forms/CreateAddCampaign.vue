<template>
  <h4 class="text-lg font-bold">Deploy Advertisement Campaign contract</h4>

  <UForm
    :schema="formSchema"
    :state="formState"
    class="flex flex-col gap-5"
    @submit="deployAdCampaign"
  >
    <h3 class="pt-4">
      By clicking "Deploy Advertisement Contract" you agree to deploy an advertisement campaign
      contract and this may take some time and pay for gas fee.
      <UButton color="secondary" size="xs" @click="viewContractCode()" label="view code" />
    </h3>

    <UFormField name="bankAddress" label="Bank Contract">
      <UInput
        v-model="formState.bankAddress"
        type="text"
        class="w-full"
        disabled
        data-testid="bank-address-input"
      />
    </UFormField>

    <UFormField name="costPerClick" label="Click rate">
      <UInput
        v-model="formState.costPerClick"
        type="number"
        step="any"
        class="w-full"
        placeholder="cost per click in matic"
      />
    </UFormField>

    <UFormField name="costPerImpression" label="Impression rate">
      <UInput
        v-model="formState.costPerImpression"
        type="number"
        step="any"
        class="w-full"
        placeholder="cost per in matic"
      />
    </UFormField>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-heroicons-x-circle"
      :description="errorMessage"
      data-test="deploy-error-alert"
    />

    <div class="modal-action justify-right">
      <UButton
        color="primary"
        size="sm"
        type="submit"
        :loading="loading"
        :disabled="loading || bankMissing"
        data-test="confirm-button"
        label="confirm"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

import { useDeployContract } from '@/composables/useContractFunctions'
import { useUserDataStore } from '@/stores/user'
import { useTeamStore } from '@/stores'
import { AD_CAMPAIGN_MANAGER_ABI } from '@/artifacts/abi/ad-campaign-manager'
import { CAMPAIGN_BYTECODE } from '@/artifacts/bytecode/adCampaignManager.ts'
import type { Hex } from 'viem'
import { useCreateContractMutation } from '@/queries/contract.queries'
import { useQueryClient } from '@tanstack/vue-query'

const emit = defineEmits(['closeAddCampaignModal'])
const toast = useToast()

const campaignBytecode = CAMPAIGN_BYTECODE as Hex
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const bankAddress = teamStore.getContractAddressByType('Bank')
const queryClient = useQueryClient()

const costPerClick = ref<string | null>(null)
const costPerImpression = ref<string | null>(null)

const formState = reactive({
  bankAddress: bankAddress ?? '',
  costPerClick: '' as string,
  costPerImpression: '' as string
})

const positiveAmount = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine((value) => /^(?:\d+\.?\d*|\.\d+)$/.test(value), 'Must be a valid number')
  .refine((value) => Number(value) > 0, 'Must be greater than 0')

const formSchema = z.object({
  bankAddress: z.string().optional(),
  costPerClick: positiveAmount,
  costPerImpression: positiveAmount
})

type CampaignFormSchema = z.output<typeof formSchema>

function reset() {
  costPerClick.value = null
  costPerImpression.value = null
  formState.costPerClick = ''
  formState.costPerImpression = ''
}
defineExpose({ reset })

const bankMissing = computed(() => !formState.bankAddress)
const submissionError = ref<string | null>(
  bankMissing.value ? 'Bank contract must be set up before deploying a campaign.' : null
)

const {
  deploy,
  isDeploying: loading,
  contractAddress,
  error: deployError
} = useDeployContract(AD_CAMPAIGN_MANAGER_ABI, campaignBytecode)

const { mutateAsync: createContract } = useCreateContractMutation()

const errorMessage = computed(() => {
  if (submissionError.value) return submissionError.value
  const err = deployError.value
  if (!err) return null
  const message = (err as { shortMessage?: string; message?: string }).shortMessage ?? err.message
  if (message?.includes('User rejected the request')) return 'User rejected the request'
  return message ?? 'Deployment failed, please retry'
})

watch(contractAddress, async (newAddress) => {
  if (newAddress && teamStore.currentTeam) {
    try {
      await createContract({
        body: {
          teamId: teamStore.currentTeam.id,
          contractAddress: newAddress,
          contractType: 'Campaign',
          deployer: userDataStore.address
        }
      })

      queryClient.invalidateQueries({
        queryKey: ['team', { teamId: String(teamStore.currentTeam.id) }]
      })

      toast.add({ title: `Contract deployed and added to team successfully`, color: 'success' })
      emit('closeAddCampaignModal')
    } catch (error) {
      console.error('Failed to add contract to team:', error)
      toast.add({
        title: 'Contract deployed but failed to add to team. Please try again.',
        color: 'error'
      })
    }
  }
})

const deployAdCampaign = async (event: FormSubmitEvent<CampaignFormSchema>) => {
  costPerClick.value = event.data.costPerClick
  costPerImpression.value = event.data.costPerImpression

  if (!event.data.bankAddress) {
    submissionError.value = 'Bank contract must be set up before deploying a campaign.'
    return
  }

  submissionError.value = null
  await deploy(event.data.bankAddress, event.data.costPerClick, event.data.costPerImpression)
}

const viewContractCode = () => {
  const url = 'https://polygonscan.com/address/0x30625FE0E430C3cCc27A60702B79dE7824BE7fD5#code'
  window.open(url, '_blank')
}
</script>
