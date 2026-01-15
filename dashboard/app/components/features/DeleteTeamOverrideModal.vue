<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-error-400">
              Confirm Deletion
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

        <div class="space-y-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-alert-triangle"
            title="Warning: This action cannot be undone"
          >
            <template #description>
              <div class="space-y-2">
                <p>You are about to remove the team override:</p>
                <p class="font-semibold">
                  "{{ override?.teamName }}"
                </p>
                <p class="text-sm">
                  This team will revert to using the global restriction settings.
                </p>
              </div>
            </template>
          </UAlert>

          <div class="flex items-center gap-3 pt-4 justify-between">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="loading"
              @click="handleClose"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="loading"
              :disabled="loading"
              data-test="confirm-delete-override-btn"
              icon="i-lucide-trash-2"
              @click="handleConfirm"
            >
              Remove Override
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TeamRestrictionOverride } from '~/types'
import { removeFeatureTeamOverride } from '~/api/features'

// Props
interface Props {
  open: boolean
  override: TeamRestrictionOverride | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// State
const loading = ref(false)

// Computed
const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

// Methods
const handleConfirm = async () => {
  if (!props.override) return

  try {
    loading.value = true
    await removeFeatureTeamOverride('SUBMIT_RESTRICTION', props.override.teamId)
    handleClose()
  } catch (error) {
    console.error('Failed to remove team override:', error)
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  emit('update:open', false)
}
</script>
