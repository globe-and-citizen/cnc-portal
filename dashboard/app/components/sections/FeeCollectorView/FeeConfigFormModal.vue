<template>
  <UModal
    :open="modelValue"
    :title="mode === 'edit' ? 'Edit Fee Config' : 'Add Fee Config'"
    :close="{ onClick: () => handleClose() }"
    class="max-w-lg mx-auto rounded-xl shadow-lg bg-white dark:bg-gray-900 p-0"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #body>
      <UForm
        :schema="feeConfigSchema"
        :state="localConfig"
        class="space-y-6"
        @submit="handleSubmit"
      >
        <!-- <div class="flex flex-row md:flex-row gap-4 items-start"> -->
        <UFormField
          label="Contract Type"
          name="contractType"
          class="flex-1"
        >
          <template v-if="mode === 'add' && feeConfigs">
            <USelect
              v-model="localConfig.contractType"
              :items="availableContractTypes"
              placeholder="Select contract type"
              :disabled="isLoading"
              class="w-full"
            />
          </template>
          <template v-else>
            <UInput
              v-model="localConfig.contractType"
              :disabled="true"
              placeholder="e.g. Marketplace, NFT, Token"
              class="w-full"
            />
          </template>
        </UFormField>
        <UFormField
          label="Fee (%)"
          name="feePercent"
          class="flex-1"
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
            class="w-full"
          />
          <div class="text-xs text-gray-500 mt-1">
            Max: 100%
          </div>
        </UFormField>
        <!-- </div> -->
        <div class="text-xs text-gray-500 mt-2">
          Will be saved as <span class="font-semibold">{{ Math.round(localConfig.feePercent * 100) }} BPS</span> (<span class="font-semibold">{{ localConfig.feePercent }}%</span>)
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="isLoading"
            type="button"
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
      </UForm>
      <UAlert
        v-if="setFee.isError.value"
        color="error"
        variant="subtle"
        :title="`Failed to ${mode === 'edit' ? 'update' : 'add'} fee`"
        :description="errorDescription"
        icon="i-lucide-terminal"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'

import { useFeeConfigs } from '~/composables/FeeCollector/read'
import { useSetFee } from '~/composables/FeeCollector/writes'
import { teamContractTypes } from '~/types/teamContracts'
import { parseErrorV2 } from '@/utils'

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

const emit = defineEmits(['update:modelValue', 'close'])

const { data: feeConfigs } = useFeeConfigs()

const localConfig = ref<FeeConfigInput>({
  contractType: props.feeConfig?.contractType || '',
  feePercent: props.feeConfig
    ? props.feeConfig.feeBps / 100
    : 0
})

const setFee = useSetFee()

const isLoading = computed(() => setFee.isPending.value)

const errorDescription = computed(() => {
  const err = setFee.error.value
  if (!err) return ''
  return parseErrorV2(err)
})

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
const handleSubmit = async (event: { data: FeeConfigOutput }) => {
  if (isLoading.value) return

  const { contractType, feeBps } = event.data

  try {
    await setFee.mutateAsync({ args: [contractType, feeBps] })
    // V3 auto-invalidates the contract's readContract queries (fee configs
    // included) on success, so no manual refetch needed here.
    handleClose()
  } catch {
    // Error surfaced via setFee.error + the UAlert below.
  }
}
</script>
