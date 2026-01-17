<template>
  <div class="flex items-center justify-end gap-2">
    <UButton
      icon="i-lucide-trash"
      color="error"
      variant="ghost"
      size="sm"
      aria-label="Remove override"
      @click="openModal = true"
    />
  </div>
  <UModal v-model:open="openModal" title="Remove Team Override" description="Confirm removal of the team override">
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
              @click="openModal = false"
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
                <p>You are about to remove the team override: for</p>
                <p class="font-semibold">
                  "{{ override?.team.name || 'Unknown Team' }}"
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
              @click="openModal = false"
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
import { useRemoveFeatureTeamOverrideQuery } from '~/queries'
import type { TeamFunctionOverride } from '~/types/feature'

const openModal = ref(false)

// Props
interface Props {
  override: TeamFunctionOverride
}

const props = defineProps<Props>()

// Query hooks
const { mutateAsync: removeTeamOverride, isPending } = useRemoveFeatureTeamOverrideQuery()

const loading = computed(() => isPending.value)

// Methods
const handleConfirm = async () => {
  await removeTeamOverride({
    featureName: props.override.functionName,
    teamId: props.override.teamId
  })

  openModal.value = false
}
</script>
