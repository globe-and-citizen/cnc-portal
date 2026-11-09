<script setup lang="ts">
import { computed, reactive } from 'vue'
import { z } from 'zod'
import { parseEther, type Address } from 'viem'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useCreateAdvertisingCampaign } from '@/composables/campaign/writes'
import { formatToken } from '@/utils/format'

const props = defineProps<{ managerAddress: Address }>()
const emit = defineEmits<{ close: []; created: [] }>()

const schema = z.object({
  budget: z
    .string()
    .trim()
    .min(1, 'Enter a campaign budget')
    .refine((value) => /^(?:\d+\.?\d*|\.\d+)$/.test(value), 'Enter a valid amount')
    .refine((value) => Number(value) > 0, 'Budget must be greater than 0')
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({ budget: '' })
const createCampaign = useCreateAdvertisingCampaign(computed(() => props.managerAddress))
const errorMessage = computed(() => createCampaign.error.value?.message)
const budgetPreview = computed(() =>
  state.budget && Number(state.budget) > 0 ? formatToken(state.budget, 'POL') : 'Enter an amount'
)

function submit(event: FormSubmitEvent<Schema>) {
  createCampaign.mutate(
    { value: parseEther(event.data.budget) },
    {
      onSuccess: () => {
        emit('created')
        emit('close')
      }
    }
  )
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-5" @submit="submit">
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="Your wallet funds this campaign"
      description="The budget stays in the campaign manager. Approved advertising spend goes to the company Bank and any unspent amount can be returned later."
    />

    <UFormField
      name="budget"
      label="Campaign budget"
      description="The maximum amount available for clicks and impressions."
      required
    >
      <UInput
        v-model="state.budget"
        type="number"
        min="0"
        step="any"
        placeholder="0.00"
        class="w-full"
        autofocus
        data-test="campaign-budget-input"
      >
        <template #trailing><span class="text-muted text-xs">POL</span></template>
      </UInput>
    </UFormField>

    <div class="bg-elevated flex items-center justify-between rounded-lg p-3 text-sm">
      <span class="text-muted">Wallet transaction</span>
      <span class="text-highlighted font-medium">{{ budgetPreview }}</span>
    </div>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Campaign creation failed"
      :description="errorMessage"
      data-test="campaign-create-error"
    />

    <div class="flex justify-end gap-2">
      <UButton color="neutral" variant="ghost" label="Cancel" @click="emit('close')" />
      <UButton
        type="submit"
        color="primary"
        icon="i-lucide-wallet-cards"
        label="Fund and create campaign"
        :loading="createCampaign.isPending.value"
        :disabled="createCampaign.isPending.value"
        data-test="campaign-create-submit"
      />
    </div>
  </UForm>
</template>
