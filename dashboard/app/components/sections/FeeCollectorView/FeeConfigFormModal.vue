<template>
  <UModal
    :open="modelValue"
    :title="mode === 'edit' ? 'Edit Fee Config' : 'Add Fee Config'"
    :close="{ onClick: () => handleClose() }"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #body>
      <UFlex class="items-center">
        <UFormGroup label="Contract Type" class="flex-1 mr-3">
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
        </UFormGroup>
        <UFormGroup label="Fee (%)">
          <UInput
            v-model.number="feePercent"
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
        </UFormGroup>
      </UFlex>
      <div class="text-xs text-gray-500 mt-2">
        Will be saved as {{ localConfig.feeBps }} BPS ({{ feePercent }}%)
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
          :disabled="!isValid || isLoading"
          :loading="isLoading"
          @click="handleSubmit"
        >
          {{ mode === 'edit' ? 'Update Fee' : 'Add Fee' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import { useFeeConfigs } from '~/composables/FeeCollector/read'
import { useSetFee } from '~/composables/FeeCollector/writes'
import { teamContractTypes } from '~/types/teamContracts'

interface FeeConfig {
  contractType: string
  feeBps: number
}

const props = defineProps<{
  modelValue: boolean
  feeConfig?: FeeConfig
  mode: 'edit' | 'add'
}>()

const emit = defineEmits(['update:modelValue', 'submit', 'close'])

const { data: feeConfigs } = useFeeConfigs()

const localConfig = ref<FeeConfig>({
  contractType: props.feeConfig?.contractType || '',
  feeBps: props.feeConfig?.feeBps ?? 0
})

const setFeeResult = useSetFee(
  computed(() => localConfig.value.contractType),
  computed(() => localConfig.value.feeBps)
)

const isLoading = computed(() =>
  setFeeResult.transactionTimelineResult.transactionSummaryStatus.value === 'loading'
)

// Available contract types not yet set in the contract
const availableContractTypes = computed(() => {
  const alreadySet = new Set((feeConfigs.value || []).map(cfg => cfg.contractType))
  return teamContractTypes.filter(type => !alreadySet.has(type))
})

const feePercent = ref(
  props.feeConfig?.feeBps ? props.feeConfig.feeBps / 100 : 0
)

watch(() => feePercent.value, (newVal) => {
  localConfig.value.feeBps = Math.round(newVal * 100)
})

const isValid = computed(() =>
  !!localConfig.value.contractType
  && feePercent.value >= 0
  && feePercent.value <= 100
)

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleSubmit = () => {
  if (!isValid.value || isLoading.value) return
  setFeeResult.executeWrite([localConfig.value.contractType, localConfig.value.feeBps])
}
</script>
