<template>
  <UModal
    :open="modelValue"
    :title="title"
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
        <UFormField
          label="Contract Type"
          name="contractType"
          class="flex-1"
        >
          <USelect
            v-if="mode === 'add'"
            v-model="localConfig.contractType"
            :items="availableContractTypes"
            placeholder="Select contract type"
            :disabled="setFee.isPending.value"
            class="w-full"
          />
          <UInput
            v-else
            v-model="localConfig.contractType"
            disabled
            placeholder="e.g. Marketplace, NFT, Token"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Fee (%)"
          name="feePercent"
          help="Max: 100%"
          class="flex-1"
        >
          <UInput
            v-model.number="localConfig.feePercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="0"
            :disabled="setFee.isPending.value"
            class="w-full"
          />
        </UFormField>

        <div class="text-xs text-gray-500 mt-2">
          Will be saved as
          <span class="font-semibold">{{ feeBpsPreview }} BPS</span>
          (<span class="font-semibold">{{ localConfig.feePercent }}%</span>)
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="setFee.isPending.value"
            type="button"
            @click="handleClose"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="setFee.isPending.value"
            :loading="setFee.isPending.value"
            type="submit"
          >
            {{ submitLabel }}
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
import { ref, computed, watch } from 'vue'
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

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
}>()

// The contract stores fees as uint16 basis points (integer), so the UI must
// only accept values that map exactly to a BPS integer — i.e. at most 2
// decimal places (0.01% granularity). We can't use `.multipleOf(0.01)` here:
// JS floating-point makes `0.1 % 0.01 !== 0`, so valid inputs like 0.1%
// would be rejected. Instead, scale by 100 and check the result is (within
// epsilon of) a whole number before the transform rounds it.
const feeConfigSchema = z
  .object({
    contractType: z.string().min(1, 'Contract type is required'),
    feePercent: z
      .number()
      .min(0, 'Fee must be at least 0')
      .max(100, 'Fee cannot exceed 100%')
      .refine(
        value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9,
        'Fee is limited to 0.01% precision (2 decimal places)'
      )
  })
  .transform(data => ({
    contractType: data.contractType,
    feeBps: Math.round(data.feePercent * 100)
  }))

type FeeConfigInput = z.input<typeof feeConfigSchema>
type FeeConfigOutput = z.output<typeof feeConfigSchema>

const initialState = (): FeeConfigInput => ({
  contractType: props.feeConfig?.contractType ?? '',
  feePercent: props.feeConfig ? props.feeConfig.feeBps / 100 : 0
})

const localConfig = ref<FeeConfigInput>(initialState())

// `useFeeConfigs` returns the contract's getAllFeeConfigs() output. The ABI
// inference collapses it to `{}`, so we narrow it to the struct shape here.
type OnChainFeeConfig = { contractType: string, feeBps: number }
const { data: feeConfigsRaw } = useFeeConfigs()
const feeConfigs = computed<OnChainFeeConfig[]>(
  () => (feeConfigsRaw.value as OnChainFeeConfig[] | undefined) ?? []
)

const setFee = useSetFee()

const title = computed(() =>
  props.mode === 'edit' ? 'Edit Fee Config' : 'Add Fee Config'
)
const submitLabel = computed(() =>
  props.mode === 'edit' ? 'Update Fee' : 'Add Fee'
)

const feeBpsPreview = computed(() =>
  Math.round(localConfig.value.feePercent * 100)
)

const errorDescription = computed(() => {
  const err = setFee.error.value
  return err ? parseErrorV2(err) : ''
})

// In add mode we list only contract types that aren't already configured
// on-chain, so owners can't create duplicate entries.
const availableContractTypes = computed(() => {
  const alreadySet = new Set(feeConfigs.value.map(cfg => cfg.contractType))
  return teamContractTypes.filter(type => !alreadySet.has(type))
})

// Reset form state and clear any stale mutation error every time the modal
// reopens. Add-mode callers keep this component mounted across sessions
// (v-model only, no v-if), so a manual reset is the only way to avoid
// leaking input or errors from the previous open.
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    localConfig.value = initialState()
    setFee.reset()
  }
)

const handleClose = () => {
  if (setFee.isPending.value) return
  emit('update:modelValue', false)
  emit('close')
}

const handleSubmit = async (event: { data: FeeConfigOutput }) => {
  if (setFee.isPending.value) return
  const { contractType, feeBps } = event.data
  await setFee.mutateAsync({ args: [contractType, feeBps] })
  handleClose()
}
</script>
