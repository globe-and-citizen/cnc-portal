<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-default">
                Create New Feature
              </h3>
              <p class="text-sm text-muted mt-0.5">
                Add a new feature flag to control application functionality
              </p>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Close modal"
              @click="handleClose"
            />
          </div>
        </template>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-6"
          data-test="create-feature-form"
          @submit="handleSubmit"
        >
          <UFormField
            label="Function Name"
            name="functionName"
            description="Select a predefined function name from the available options"
            required
          >
            <USelectMenu
              v-model="state.functionName"
              :items="availableFunctionOptions"
              searchable
              data-test="function-name-select"
              :disabled="loading || availableFunctionOptions.length === 0"
              icon="i-lucide-code"
              placeholder="Select a function or search..."
              class="w-full"
            >
              <template #empty>
                <div class="flex flex-col items-center justify-center py-6 text-center">
                  <UIcon name="i-lucide-inbox" class="w-8 h-8 text-muted mb-2" />
                  <p class="text-sm text-muted">
                    {{ availableFunctionOptions.length === 0 ? 'All functions are already created' : 'No functions found' }}
                  </p>
                </div>
              </template>
            </USelectMenu>
          </UFormField>

          <UFormField
            label="Initial Status"
            name="status"
            description="Set the initial status for this feature flag"
            required
          >
            <USelectMenu
              v-model="state.status"
              :items="statusOptions"
              data-test="status-select"
              :disabled="loading"
              icon="i-lucide-settings"
              class="w-full"
            />
          </UFormField>

          <div class="flex items-center gap-3 pt-4 justify-end ">
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
              :disabled="loading"
              data-test="submit-create-btn"
              icon="i-lucide-check"
            >
              Create Feature
            </UButton>
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { FeatureStatus, Feature } from '~/types'
import { useCreateFeatureQuery } from '~/queries/feature.query'

// Zod Schema
const schema = z.object({
  functionName: z.object({
    label: z.string(),
    value: z.string()
  }).refine(option => option.value.length > 0, {
    message: 'Function name is required'
  }),
  status: z.object({
    label: z.string(),
    value: z.enum(['enabled', 'disabled', 'beta'] as const)
  })
})

type Schema = z.output<typeof schema>

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

// Toast for notifications
const toast = useToast()

// Mutations
const { mutateAsync: createFeature, isPending: loading } = useCreateFeatureQuery()

// Local state
const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

// Form state with proper typing
const state = reactive<Partial<Schema>>({
  functionName: undefined,
  status: { label: 'Enabled', value: 'enabled' }
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

// Computed available functions
const availableFunctionOptions = computed(() => {
  const createdFunctionNames = props.existingFeatures.map(feature => feature.functionName)
  return PREDEFINED_FUNCTIONS.filter(func =>
    !createdFunctionNames.includes(func.value)
  )
})

// Methods
const resetForm = () => {
  state.functionName = undefined
  state.status = { label: 'Enabled', value: 'enabled' }
}

const handleSubmit = async (event: FormSubmitEvent<Schema>) => {
  try {
    await createFeature({
      functionName: event.data.functionName.value,
      status: event.data.status.value as FeatureStatus
    })

    toast.add({
      title: 'Success',
      description: `Feature "${event.data.functionName.label}" has been created successfully.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })

    handleClose()
  } catch (error) {
    console.error('Failed to create feature:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to create feature. Please try again.',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
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
