<template>
  <UModal
    :open="modelValue"
    title="Change fee beneficiary"
    :close="{ onClick: () => handleClose() }"
    class="max-w-lg mx-auto rounded-xl shadow-lg bg-white dark:bg-gray-900 p-0"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #body>
      <UForm
        :schema="beneficiarySchema"
        :state="localState"
        class="space-y-6  pb-2"
        @submit="handleSubmit"
      >
        <UFormField
          label="Beneficiary address"
          name="beneficiary"
          class="flex-1"
        >
          <AddressSearchInput
            v-model="localState.beneficiary"
            placeholder="Search a user or paste an address…"
            :disabled="isLoading"
          />
          <div class="text-xs text-gray-500 mt-1">
            Leave empty (or enter 0x0000…0000) to clear and fall back to the contract owner.
          </div>
        </UFormField>

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
            Update beneficiary
          </UButton>
        </div>
      </UForm>

      <UAlert
        v-if="setBeneficiary.isError.value"
        color="error"
        variant="subtle"
        title="Failed to update beneficiary"
        :description="errorDescription"
        icon="i-lucide-terminal"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { z } from 'zod'
import { isAddress, zeroAddress, type Address } from 'viem'
import { useSetFeeBeneficiary } from '~/composables/FeeCollector/writes'
import { parseErrorV2 } from '@/utils'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
}>()

// Zod: accept empty or a valid 0x address. Empty normalizes to zeroAddress,
// which explicitly clears the beneficiary and makes the contract fall back
// to owner() on the next withdraw.
const beneficiarySchema = z.object({
  beneficiary: z
    .string()
    .refine(
      value => value === '' || isAddress(value),
      'Must be a valid 0x address (or empty to clear)'
    )
})

type BeneficiaryInput = z.infer<typeof beneficiarySchema>

const localState = ref<BeneficiaryInput>({ beneficiary: '' })

const normalizedBeneficiary = computed<Address>(() => {
  const raw = localState.value.beneficiary.trim()
  return raw === '' ? zeroAddress : (raw as Address)
})

const setBeneficiary = useSetFeeBeneficiary()

const isLoading = computed(() => setBeneficiary.isPending.value)

const errorDescription = computed(() => {
  const err = setBeneficiary.error.value
  if (!err) return ''
  return parseErrorV2(err)
})

const handleClose = () => {
  if (isLoading.value) return
  emit('update:modelValue', false)
  emit('close')
}

const handleSubmit = async () => {
  if (isLoading.value) return
  try {
    await setBeneficiary.mutateAsync({ args: [normalizedBeneficiary.value] })
    // V3 auto-invalidates ['readContract', { address, chainId }] on success,
    // so useFeeCollectorBeneficiary refetches without an explicit refetch() call.
    emit('update:modelValue', false)
    emit('close')
  } catch {
    // Error surfaced via setBeneficiary.error + the UAlert below.
  }
}

// Reset the input whenever the modal is reopened.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      localState.value.beneficiary = ''
      setBeneficiary.reset()
    }
  }
)
</script>
