<template>
  <UModal
    :open="modelValue"
    title="Deploy New Safe"
    prevent-close
    :close="{ onClick: handleClose }"
    class="max-w-lg mx-auto rounded-xl shadow-lg "
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #body>
      <UForm class="space-y-6 px-6 pt-6 pb-4" @submit.prevent="onSubmit">
        <div>
          <label class="block font-medium mb-2">Owners</label>
          <div class="space-y-2">
            <div v-for="(owner, idx) in owners" :key="idx" class="flex gap-2 items-center">
              <UInput
                v-model="owners[idx]"
                placeholder="Owner address or ENS"
                class="flex-1"
                :disabled="isLoading"
                :state="ownerStates[idx]"
                required
                @blur="validateOwner(idx)"
              />
              <UButton
                icon="i-heroicons-trash"
                color="error"
                variant="ghost"
                size="xs"
                :disabled="owners.length === 1 || isLoading"
                @click="removeOwner(idx)"
              />
            </div>
            <div v-for="(msg, idx) in ownerErrors" :key="'err-' + idx" class="text-xs text-red-500">
              {{ msg }}
            </div>
          </div>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            variant="ghost"
            size="xs"
            class="mt-2"
            :disabled="isLoading"
            @click="addOwner"
          >
            Add Owner
          </UButton>
        </div>
        <UFormField label="Threshold" class="w-32">
          <UInput
            v-model="threshold"
            type="number"
            min="1"
            :max="owners.length"
            :disabled="isLoading"
            required
          />
          <div v-if="thresholdError" class="text-xs text-red-500">
            {{ thresholdError }}
          </div>
        </UFormField>
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            :disabled="isLoading"
            @click="handleClose"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="isLoading"
            :disabled="!formValid"
          >
            Deploy Safe
          </UButton>
        </div>
        <UAlert v-if="error" color="error" :title="error" />
        <UAlert v-if="success" color="success" :title="success" />
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSafe } from '@/composables/useSafe'
import { useConnection } from '@wagmi/vue'
import { isAddress } from 'viem'
import { useQueryClient } from '@tanstack/vue-query'

defineProps<{
  modelValue: boolean
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'deployed', message?: string): void
}>()

const { deploySafe } = useSafe()
const connection = useConnection()
const queryClient = useQueryClient()

const owners = ref<string[]>(connection.address.value ? [connection.address.value] : [''])
const ownerStates = ref<(boolean | null)[]>([null])
const ownerErrors = ref<string[]>([])
const threshold = ref(1)
const isLoading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const duplicateError = ref<string | null>(null)

function validateOwner(idx: number) {
  const ownerValue = owners.value[idx]
  const addr = ownerValue ? ownerValue.trim().toLowerCase() : ''
  if (!addr) {
    ownerStates.value[idx] = null
    ownerErrors.value[idx] = ''
    return
  }
  if (!isAddress(addr)) {
    ownerStates.value[idx] = false
    ownerErrors.value[idx] = 'Invalid address'
    return
  }
  // Auto-remove if duplicate (ignore current index)
  const isDuplicate = owners.value.some(
    (o, i) => i !== idx && o.trim().toLowerCase() === addr
  )
  if (isDuplicate) {
    owners.value.splice(idx, 1)
    ownerStates.value.splice(idx, 1)
    return
  }
  ownerStates.value[idx] = true
  ownerErrors.value[idx] = ''
}

const formValid = computed(() =>
  !isLoading.value
  && !duplicateError.value
  && !thresholdError.value
  && owners.value.length > 0
  && owners.value.every((_, idx) => (ownerStates.value?.[idx] !== false) && !!owners.value[idx]?.trim())
)

function checkDuplicates() {
  const trimmed = owners.value.map(o => o.trim().toLowerCase()).filter(Boolean)
  const duplicates = trimmed.filter((item, idx) => trimmed.indexOf(item) !== idx)
  if (duplicates.length) {
    duplicateError.value = 'Duplicate owner addresses are not allowed.'
  } else {
    duplicateError.value = null
  }
}

watch(owners, checkDuplicates, { deep: true })

const uniqueValidOwners = computed(() =>
  owners.value
    .map(o => o.trim().toLowerCase())
    .filter((addr, idx, arr) => isAddress(addr) && arr.indexOf(addr) === idx)
)

const thresholdError = computed(() =>
  threshold.value < 1 || threshold.value > uniqueValidOwners.value.length
    ? `Threshold must be between 1 and ${uniqueValidOwners.value.length}`
    : ''
)

const addOwner = () => {
  owners.value.push('')
  ownerStates.value.push(null)
}
const removeOwner = (idx: number) => {
  if (owners.value.length > 1) {
    owners.value.splice(idx, 1)
    ownerStates.value.splice(idx, 1)
  }
}
const resetForm = () => {
  owners.value = connection.address.value ? [connection.address.value] : ['']
  ownerStates.value = [null]
  threshold.value = 1
  queryClient.invalidateQueries({ queryKey: ['safes', connection.address.value] })
}

const onSubmit = async () => {
  error.value = null
  success.value = null
  isLoading.value = true
  ownerErrors.value = []
  checkDuplicates()
  // Validate all owners
  let valid = true
  owners.value.forEach((addr, idx) => {
    validateOwner(idx)
    if (ownerStates.value[idx] === false) valid = false
  })
  if (duplicateError.value) {
    error.value = duplicateError.value
    isLoading.value = false
    return
  }
  if (!valid || thresholdError.value) {
    error.value = 'Please fix errors above'
    isLoading.value = false
    return
  }
  try {
    const filteredOwners = uniqueValidOwners.value
    const safeAddress = await deploySafe(filteredOwners, threshold.value)
    emit('deployed', `Safe deployed at: ${safeAddress}`)
    handleClose()
    resetForm()
  } catch (err) {
    error.value
      = err instanceof Error
        ? err.message
        : 'Failed to deploy Safe'
  } finally {
    isLoading.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>
