<template>
  <ModalComponent v-model="isOpen" @reset="handleClose">
    <div class="flex flex-col gap-5 max-w-md">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-2xl">Update Threshold</h2>
      </div>

      <hr />

      <div class="space-y-4">
        <!-- Current Configuration -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold mb-2">Current Configuration</h4>
          <div class="text-sm text-gray-700 space-y-1">
            <div class="flex items-center gap-2">
              <IconifyIcon icon="heroicons:users" class="w-4 h-4 text-blue-600" />
              {{ totalOwners }} signers
            </div>
            <div class="flex items-center gap-2">
              <IconifyIcon icon="heroicons:shield-check" class="w-4 h-4 text-green-600" />
              {{ currentThreshold }} of {{ totalOwners }} required
            </div>
          </div>
        </div>

        <!-- Threshold Selection -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700"> Select New Threshold </label>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-gray-600">Threshold:</label>
              <input
                type="number"
                :min="1"
                :max="totalOwners"
                v-model.number="newThreshold"
                class="input input-bordered input-sm w-20"
                data-test="threshold-input"
              />
            </div>
            <span class="text-sm text-gray-500">
              of {{ totalOwners }} signers required to execute transactions
            </span>
          </div>

          <div
            v-for="error in $v.newThreshold.$errors"
            :key="error.$uid"
            class="text-red-500 text-sm"
            data-test="threshold-error"
          >
            {{ error.$message }}
          </div>
        </div>

        <!-- Summary -->
        <div v-if="hasChanges" class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold mb-2">Summary</h4>
          <div class="text-sm text-gray-700 space-y-1">
            <div class="flex items-center gap-2">
              <IconifyIcon icon="heroicons:arrow-right" class="w-4 h-4 text-green-600" />
              Updating threshold from {{ currentThreshold }} to {{ newThreshold }}
            </div>
            <div class="flex items-center gap-2">
              <IconifyIcon icon="heroicons:shield-check" class="w-4 h-4 text-blue-600" />
              {{ newThreshold }} of {{ totalOwners }} signatures will be required
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <ButtonUI
          variant="ghost"
          @click="handleClose"
          :disabled="isLoading"
          data-test="cancel-button"
        >
          Cancel
        </ButtonUI>
        <ButtonUI
          variant="primary"
          :loading="isLoading"
          :disabled="!hasChanges || !isValidThreshold || isLoading"
          @click="handleUpdateThreshold"
          data-test="update-threshold-button"
          class="flex items-center gap-2"
        >
          <IconifyIcon v-if="!isLoading" icon="heroicons:shield-check" class="w-4 h-4" />
          Update Threshold
        </ButtonUI>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, minValue, maxValue } from '@vuelidate/validators'
import { type Address } from 'viem'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { useToastStore } from '@/stores'
import { useSafeOwnerManagement } from '@/composables/safe'

interface Props {
  modelValue: boolean
  safeAddress: Address
  currentOwners: string[]
  currentThreshold: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'threshold-updated': []
}>()

const { addSuccessToast, addErrorToast } = useToastStore()

// Use Safe owner management composable
const { isUpdating, updateOwners } = useSafeOwnerManagement()

// Form state
const newThreshold = ref(props.currentThreshold)

// Computed values
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const isLoading = computed(() => isUpdating.value)
const totalOwners = computed(() => props.currentOwners.length)
const hasChanges = computed(() => newThreshold.value !== props.currentThreshold)

// Validation rules
const rules = {
  newThreshold: {
    required,
    minValue: minValue(1),
    maxValue: maxValue(totalOwners)
  }
}

const $v = useVuelidate(rules, { newThreshold })

const isValidThreshold = computed(() => !$v.value.$invalid)

// Methods
const handleUpdateThreshold = async () => {
  $v.value.$touch()

  if ($v.value.$invalid) {
    addErrorToast('Please fix validation errors before proceeding')
    return
  }

  if (!hasChanges.value) {
    addErrorToast('No changes to apply')
    return
  }

  try {
    const txHash = await updateOwners(props.safeAddress, {
      newThreshold: newThreshold.value,
      shouldPropose: props.currentThreshold >= 2
    })

    if (txHash) {
      addSuccessToast('Threshold update submitted successfully')
      emit('threshold-updated')
      handleClose()
    }
  } catch (error) {
    console.error('Failed to update threshold:', error)
    addErrorToast('Failed to update threshold')
  }
}

const handleClose = () => {
  newThreshold.value = props.currentThreshold
  $v.value.$reset()
  emit('update:modelValue', false)
}
</script>
