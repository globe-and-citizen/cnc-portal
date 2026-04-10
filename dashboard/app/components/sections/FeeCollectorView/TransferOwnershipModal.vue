<template>
  <UModal
    :open="modelValue"
    title="Transfer ownership"
    :close="{ onClick: () => handleClose() }"
    class="max-w-lg mx-auto rounded-xl shadow-lg bg-white dark:bg-gray-900 p-0"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="warning"
          variant="subtle"
          title="Irreversible action"
          description="Transferring ownership is immediate and cannot be undone. The current owner will lose all control of the FeeCollector contract."
          icon="i-heroicons-exclamation-triangle"
        />

        <UForm
          :schema="schema"
          :state="localState"
          class="space-y-4"
          @submit="handleSubmit"
        >
          <UFormField
            label="New owner address"
            name="newOwner"
            class="flex-1"
          >
            <UInput
              v-model="localState.newOwner"
              placeholder="0x…"
              :disabled="transferOwnership.isPending.value"
              class="w-full"
            />
          </UFormField>

          <div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>Current owner:</span>
            <UserIdentity v-if="currentOwner" :address="currentOwner" />
            <span v-else class="italic">loading…</span>
          </div>

          <UFormField name="confirmed">
            <UCheckbox
              v-model="localState.confirmed"
              :disabled="transferOwnership.isPending.value"
              label="I understand this transfer is irreversible and I will lose ownership."
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="transferOwnership.isPending.value"
              type="button"
              @click="handleClose"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :disabled="!localState.confirmed || transferOwnership.isPending.value"
              :loading="transferOwnership.isPending.value"
              type="submit"
            >
              Transfer ownership
            </UButton>
          </div>
        </UForm>

        <UAlert
          v-if="transferOwnership.isError.value"
          color="error"
          variant="subtle"
          title="Failed to transfer ownership"
          :description="errorDescription"
          icon="i-lucide-terminal"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { z } from 'zod'
import { isAddress, zeroAddress, type Address } from 'viem'
import { useFeeCollectorOwner } from '~/composables/FeeCollector/read'
import { useTransferOwnership } from '~/composables/FeeCollector/writes'
import { parseErrorV2 } from '@/utils'
import UserIdentity from '@/components/UserIdentity.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
}>()

const { data: currentOwnerData } = useFeeCollectorOwner()
const currentOwner = computed(() => currentOwnerData.value as Address | undefined)

const transferOwnership = useTransferOwnership()

interface TransferState {
  newOwner: string
  confirmed: boolean
}

const initialState = (): TransferState => ({ newOwner: '', confirmed: false })

const localState = ref<TransferState>(initialState())

// `currentOwnerData` is read lazily inside the refinements so the check stays
// reactive: the refine closure runs on every validation pass, pulling the
// latest owner value from the wagmi read.
const schema = z.object({
  newOwner: z
    .string()
    .refine(v => isAddress(v), 'Must be a valid 0x address')
    .refine(v => v !== zeroAddress, 'Cannot transfer to the zero address')
    .refine(
      v => !currentOwner.value || v.toLowerCase() !== currentOwner.value.toLowerCase(),
      'New owner must differ from the current owner'
    ),
  confirmed: z.boolean().refine(v => v === true, 'You must confirm the transfer')
})

const errorDescription = computed(() => {
  const err = transferOwnership.error.value
  return err ? parseErrorV2(err) : ''
})

const handleClose = () => {
  if (transferOwnership.isPending.value) return
  emit('update:modelValue', false)
  emit('close')
}

const handleSubmit = async () => {
  if (transferOwnership.isPending.value) return
  await transferOwnership.mutateAsync({
    args: [localState.value.newOwner as Address]
  })
  handleClose()
}

// Clear state and any stale mutation error on every reopen.
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    localState.value = initialState()
    transferOwnership.reset()
  }
)
</script>
