<script setup lang="ts">
import { computed, reactive } from 'vue'
import { formatUnits, parseEther, type Address } from 'viem'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AdvertisingCampaign } from '@/composables/campaign/reads'
import { useWithdrawAdvertisingCampaign } from '@/composables/campaign/writes'
import { formatTokenUnits } from '@/utils/format'

const props = defineProps<{
  managerAddress: Address
  campaign: AdvertisingCampaign
}>()
const emit = defineEmits<{ close: []; withdrawn: [] }>()

const schema = z.object({
  finalSpend: z
    .string()
    .trim()
    .min(1, 'Enter the final reported spend')
    .refine((value) => /^(?:\d+\.?\d*|\.\d+)$/.test(value), 'Enter a valid amount')
    .refine((value) => parseEther(value) >= props.campaign.amountSpent, {
      message: 'Final spend cannot be lower than the amount already paid'
    })
    .refine((value) => parseEther(value) <= props.campaign.budget, {
      message: 'Final spend cannot exceed the campaign budget'
    })
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({ finalSpend: formatUnits(props.campaign.amountSpent, 18) })
const withdrawCampaign = useWithdrawAdvertisingCampaign(computed(() => props.managerAddress))
const finalSpend = computed(() => {
  try {
    return parseEther(state.finalSpend || '0')
  } catch {
    return 0n
  }
})
const amountReturned = computed(() =>
  props.campaign.budget > finalSpend.value ? props.campaign.budget - finalSpend.value : 0n
)

function submit(event: FormSubmitEvent<Schema>) {
  withdrawCampaign.mutate(
    { args: [props.campaign.code, parseEther(event.data.finalSpend)] },
    {
      onSuccess: () => {
        emit('withdrawn')
        emit('close')
      }
    }
  )
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-5" @submit="submit">
    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="This closes the campaign"
      description="Any newly reported spend is paid to the company Bank. The remaining budget is returned to the campaign advertiser."
    />

    <dl class="grid grid-cols-2 gap-3 text-sm">
      <div class="bg-elevated rounded-lg p-3">
        <dt class="text-muted">Campaign budget</dt>
        <dd class="text-highlighted mt-1 font-medium">
          {{ formatTokenUnits(campaign.budget, 18, 'POL') }}
        </dd>
      </div>
      <div class="bg-elevated rounded-lg p-3">
        <dt class="text-muted">Already paid</dt>
        <dd class="text-highlighted mt-1 font-medium">
          {{ formatTokenUnits(campaign.amountSpent, 18, 'POL') }}
        </dd>
      </div>
    </dl>

    <UFormField
      name="finalSpend"
      label="Final reported spend"
      description="Include any advertising spend that has not been paid to the Bank yet."
      required
    >
      <UInput
        v-model="state.finalSpend"
        type="number"
        min="0"
        step="any"
        class="w-full"
        data-test="campaign-final-spend-input"
      >
        <template #trailing><span class="text-muted text-xs">POL</span></template>
      </UInput>
    </UFormField>

    <div class="border-default rounded-lg border p-4">
      <p class="text-muted text-sm">Estimated amount returned to the advertiser</p>
      <p class="text-highlighted mt-1 text-xl font-semibold">
        {{ formatTokenUnits(amountReturned, 18, 'POL') }}
      </p>
    </div>

    <UAlert
      v-if="withdrawCampaign.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Withdrawal failed"
      :description="withdrawCampaign.error.value.message"
      data-test="campaign-withdraw-error"
    />

    <div class="flex justify-end gap-2">
      <UButton color="neutral" variant="ghost" label="Cancel" @click="emit('close')" />
      <UButton
        type="submit"
        color="warning"
        icon="i-lucide-circle-dollar-sign"
        label="Close and withdraw"
        :loading="withdrawCampaign.isPending.value"
        :disabled="withdrawCampaign.isPending.value"
        data-test="campaign-withdraw-submit"
      />
    </div>
  </UForm>
</template>
