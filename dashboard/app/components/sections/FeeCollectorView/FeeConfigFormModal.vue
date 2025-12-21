<template>
  <UModal
    :open="modelValue"
    :title="mode === 'edit' ? 'Edit Fee Config' : 'Add Fee Config'"
    :close="{ onClick: () => handleClose() }"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #body>
      <UForm
        :schema="feeConfigSchema"
        :state="localConfig"
        class="space-y-4"
        @submit="handleSubmit"
      >
        <UFormField label="Contract Type" class="flex-1 mr-3">
          <template v-if="mode === 'add' && feeConfigs">
            <USelect
              v-model="localConfig.contractType"
              :items="availableContractTypes"
              placeholder="Select contract type"
              :disabled="isLoading"
              class="w-1/2"
            />
          </template>
          <template v-else>
            <UInput
              v-model="localConfig.contractType"
              :disabled="true"
              placeholder="e.g. Marketplace, NFT, Token"
            />
          </template>
        </UFormField>
        <UFormField
          label="Fee (%)"
          name="feePercent"
        >
          <UInput
            v-model.number="localConfig.feePercent"
            name="feePercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0"
            :disabled="isLoading"
          />
          <div class="text-xs text-gray-500 mt-1">
            Max: 100%
          </div>
        </UFormField>
      </UForm>
      <div class="text-xs text-gray-500 mt-2">
        Will be saved as {{ Math.round(localConfig.feePercent * 100) }} BPS ({{ localConfig.feePercent }}%)
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 pt-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="isLoading"
          @click="handleClose"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          :disabled="isLoading"
          :loading="isLoading"
          type="submit"
        >
          {{ mode === 'edit' ? 'Update Fee' : 'Add Fee' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'

import { useFeeConfigs } from '~/composables/FeeCollector/read'
import { useSetFee } from '~/composables/FeeCollector/writes'
import { teamContractTypes } from '~/types/teamContracts'

interface FeeConfig {
  contractType: string
  feeBps: number
  feePercent: number
}

const props = defineProps<{
  modelValue: boolean
  feeConfig?: FeeConfig
  mode: 'edit' | 'add'
}>()

const emit = defineEmits(['update:modelValue', 'submit', 'close'])

const { data: feeConfigs } = useFeeConfigs()

const localConfig = ref<FeeConfigInput>({
  contractType: props.feeConfig?.contractType || '',
  feePercent: props.feeConfig
    ? props.feeConfig.feeBps / 100
    : 0
})

const setFeeResult = useSetFee(
  computed(() => localConfig.value.contractType),
  computed(() => Math.round(localConfig.value.feePercent * 100))
)

const isLoading = computed(() =>
  setFeeResult.transactionTimelineResult.transactionSummaryStatus.value === 'loading'
)

// Available contract types not yet set in the contract
const availableContractTypes = computed(() => {
  const alreadySet = new Set((feeConfigs.value || []).map(cfg => cfg.contractType))
  return teamContractTypes.filter(type => !alreadySet.has(type))
})

const feeConfigSchema = z.object({
  contractType: z.string().min(1, 'Contract type is required'),
  feePercent: z
    .number()
    .min(0, 'Fee must be at least 0')
    .max(100, 'Fee cannot exceed 100%')
})
  .transform(data => ({
    contractType: data.contractType,
    feeBps: Math.round(data.feePercent * 100)
  }))

// { contractType: string; feePercent: number }
type FeeConfigInput = z.input<typeof feeConfigSchema>

// { contractType: string; feeBps: number }
type FeeConfigOutput = z.output<typeof feeConfigSchema>

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}
const handleSubmit = (event: { data: FeeConfigOutput }) => {
  if (isLoading.value) return

  const { contractType, feeBps } = event.data

  setFeeResult.executeWrite([contractType, feeBps])
}
</script>
