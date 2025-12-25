<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              Create New Feature
            </h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="handleClose"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium mb-2">
              Function Name <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.functionName"
              placeholder="e.g., SUBMIT_RESTRICTION"
              data-test="function-name-input"
              :disabled="loading"
              icon="i-lucide-code"
              required
            />
            <p class="text-xs text-muted mt-1">
              Enter a unique function name (e.g., SUBMIT_RESTRICTION, APPROVAL_FLOW)
            </p>
            <p v-if="formErrors.functionName" class="text-xs text-red-500 mt-1">
              {{ formErrors.functionName }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              Status <span class="text-red-500">*</span>
            </label>
            <USelect
              v-model="form.status"
              :items="statusOptions"
              value-key="value"
              data-test="status-select"
              :disabled="loading"
              icon="i-lucide-settings"
            />
            <p class="text-xs text-muted mt-1">
              Set the initial status for this feature
            </p>
          </div>

          <div class="flex items-center gap-3 pt-4 justify-between">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="loading"
              @click="handleClose"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              color="primary"
              :loading="loading"
              :disabled="!isFormValid || loading"
              data-test="submit-create-btn"
              icon="i-lucide-check"
            >
              Create Feature
            </UButton>
          </div>
        </form>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FeatureStatus, Feature } from '~/types'

// Props
interface Props {
  open: boolean
  loading?: boolean
  existingFeatures?: Feature[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  existingFeatures: () => []
})

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: { functionName: string, status: FeatureStatus }]
}>()

// Local state
const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const form = reactive({
  functionName: '',
  status: 'enabled' as FeatureStatus
})

const formErrors = reactive({
  functionName: ''
})

// Status options
const statusOptions = [
  { label: 'Enabled', value: 'enabled' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Beta', value: 'beta' }
]

// Computed
const isFormValid = computed(() => {
  return form.functionName.trim().length > 0 && form.status
})

// Methods
const resetForm = () => {
  form.functionName = ''
  form.status = 'enabled'
  formErrors.functionName = ''
}

const validateForm = () => {
  formErrors.functionName = ''

  if (!form.functionName.trim()) {
    formErrors.functionName = 'Function name is required'
    return false
  }

  if (form.functionName.length < 3) {
    formErrors.functionName = 'Function name must be at least 3 characters'
    return false
  }

  // Check if feature already exists
  if (props.existingFeatures.some(f => f.functionName.toLowerCase() === form.functionName.toLowerCase())) {
    formErrors.functionName = 'A feature with this name already exists'
    return false
  }

  return true
}

const handleSubmit = () => {
  if (!validateForm()) return

  emit('submit', {
    functionName: form.functionName.trim(),
    status: form.status
  })
}

const handleClose = () => {
  resetForm()
  emit('update:open', false)
}

// Watch for modal open to reset form
watch(() => props.open, (newValue) => {
  if (newValue) {
    resetForm()
  }
})
</script>
