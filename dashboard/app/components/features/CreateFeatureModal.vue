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
            <USelect
              v-model="form.functionName"
              :items="availableFunctionOptions"
              searchable
              clearable
              data-test="function-name-select"
              :disabled="loading || availableFunctionOptions.length === 0"
              icon="i-lucide-code"
              placeholder="Select a function or search..."
            />
            <p class="text-xs text-muted mt-1">
              Select a predefined function name
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
import { useCreateFeature } from '~/queries/feature.query'

// Props
interface Props {
  open: boolean
  existingFeatures?: Feature[]
}

const props = withDefaults(defineProps<Props>(), {
  existingFeatures: () => []
})

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// Mutations
const createFeatureMutation = useCreateFeature()

const loading = computed(() => createFeatureMutation.isPending.value)

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

// Predefined functions with readable labels
const PREDEFINED_FUNCTIONS = [
  { label: 'SUBMIT_RESTRICTION', value: 'SUBMIT_RESTRICTION' }
]

// Status options
const statusOptions = [
  { label: 'Enabled', value: 'enabled' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Beta', value: 'beta' }
]

const availableFunctionOptions = computed(() => {
  const createdFunctionNames = props.existingFeatures.map(fonction => fonction.functionName)
  return PREDEFINED_FUNCTIONS.filter(func =>
    !createdFunctionNames.includes(func.value)
  )
})

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

  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    await createFeatureMutation.mutateAsync({
      functionName: form.functionName.trim(),
      status: form.status
    })
    handleClose()
  } catch (error) {
    console.error('Failed to create feature:', error)
  }
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
