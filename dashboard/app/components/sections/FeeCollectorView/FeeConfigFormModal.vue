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
          <template v-if="mode === 'add'">
            <USelect
              v-model="localConfig.contractType"
              :items="availableContractTypes"
              placeholder="Select contract type"
              :disabled="loading"
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
            :disabled="loading"
          />
          <div class="text-xs text-gray-500 mt-1">
            Max: 100%
          </div>
        </UFormGroup>
      </UFlex>
      <div class="text-xs text-gray-500 mt-2">
        Will be saved as {{ feeBps }} BPS ({{ feePercent }}%)
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 pt-2">
        <UButton
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="handleClose"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          :disabled="!isValid || loading"
          :loading="loading"
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

import { useFeeCollector } from '@/composables/useFeeCollector'

interface FeeConfig {
  contractType: string
  feeBps: number
}

const props = defineProps<{
  modelValue: boolean
  feeConfig?: FeeConfig
  mode: 'edit' | 'add'
  loading?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'submit', 'close'])

const { availableContractTypes } = useFeeCollector()

const localConfig = ref<FeeConfig>({
  contractType: props.feeConfig?.contractType || '',
  feeBps: props.feeConfig?.feeBps ?? 0
})

const feePercent = ref(
  props.feeConfig?.feeBps ? props.feeConfig.feeBps / 100 : 0
)

watch(() => props.feeConfig, (cfg) => {
  if (cfg) {
    localConfig.value = { ...cfg }
    feePercent.value = cfg.feeBps / 100
  } else {
    localConfig.value = { contractType: '', feeBps: 0 }
    feePercent.value = 0
  }
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open && props.mode === 'add') {
      // Reset only for add mode
      localConfig.value = { contractType: '', feeBps: 0 }
      feePercent.value = 0
    }
  }
)

const feeBps = computed(() => Math.round(feePercent.value * 100))

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
  if (!isValid.value || props.loading) return
  emit('submit', {
    contractType: localConfig.value.contractType,
    feeBps: feeBps.value
  })
}
</script>
