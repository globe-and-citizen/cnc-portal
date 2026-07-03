<template>
  <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
    <UTooltip :text="disabledTooltip" :delay-duration="0">
      <span class="inline-flex max-w-full">
        <UButton
          color="neutral"
          variant="subtle"
          size="sm"
          icon="i-lucide-target"
          data-test="submit-weekly-goals-button"
          :disabled="!canSubmit || archivedDisabled"
          @click="openModal()"
        >
          {{ hasExistingGoals ? 'Edit Weekly Goals' : 'Submit Weekly Goals' }}
        </UButton>
      </span>
    </UTooltip>
  </TeamArchivedTooltip>

  <UModal
    v-if="modal.mount"
    v-model:open="modal.show"
    title="Weekly Goals"
    description="Write a Markdown memo of what you plan to accomplish this week. One memo per week."
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <MarkdownEditor
          v-model="goals"
          placeholder="e.g. **Ship** the weekly goals editor, review 2 PRs…"
        />

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="Failed to submit weekly goals"
          :description="errorMessage"
          data-test="submit-weekly-goals-error"
        />

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="isPending"
            data-test="submit-weekly-goals-cancel"
            @click="modal.show = false"
          >
            Cancel
          </UButton>
          <UButton
            color="success"
            :loading="isPending"
            data-test="submit-weekly-goals-confirm"
            @click="handleSubmit"
          >
            Save Goals
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useToast } from '@nuxt/ui/composables'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import { useTeamStore } from '@/stores'
import { useSubmitWeeklyGoalsMutation } from '@/queries/weeklyClaim.queries'
import type { WeeklyClaim } from '@/types'
import { getAxiosErrorMessage } from '@/utils/errorUtil'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const props = defineProps<{
  weeklyClaim?: WeeklyClaim
  selectedWeekStart?: string
}>()

const toast = useToast()
const teamStore = useTeamStore()

const modal = ref({ mount: false, show: false })
const goals = ref('')
const errorMessage = ref<string | null>(null)

const teamId = computed(() => teamStore.currentTeamId)

const hasExistingGoals = computed(() => !!props.weeklyClaim?.weeklyGoals)

// Goals stay editable until the week is signed / withdrawn / disabled — mirrors
// the daily-claim rule (only a `pending` week accepts changes). No existing
// weekly claim means the week is fresh and open.
const canSubmit = computed(() => {
  if (!props.weeklyClaim) return true
  return props.weeklyClaim.status === 'pending'
})

const disabledTooltip = computed(() =>
  !canSubmit.value && props.weeklyClaim
    ? `This week is ${props.weeklyClaim.status}; weekly goals can no longer be edited.`
    : undefined
)

const openModal = () => {
  goals.value = props.weeklyClaim?.weeklyGoals ?? ''
  errorMessage.value = null
  modal.value = { mount: true, show: true }
}

// Fully unmount the modal (and drop transient error state) once it closes.
watch(
  () => modal.value.show,
  (isOpen) => {
    if (!isOpen) {
      errorMessage.value = null
      modal.value = { mount: false, show: false }
    }
  },
  { flush: 'post' }
)

const { mutateAsync: submitGoals, isPending } = useSubmitWeeklyGoalsMutation()

const handleSubmit = async () => {
  if (!teamId.value) {
    toast.add({ title: 'Team not selected', color: 'error' })
    return
  }

  const weekStart = props.selectedWeekStart ?? dayjs.utc().startOf('isoWeek').toISOString()
  errorMessage.value = null

  try {
    await submitGoals({
      body: {
        teamId: teamId.value,
        weekStart,
        weeklyGoals: goals.value
      }
    })
    toast.add({ title: 'Weekly goals saved successfully', color: 'success' })
    modal.value.show = false
  } catch (error) {
    errorMessage.value = getAxiosErrorMessage(error, 'Failed to save weekly goals')
  }
}

defineExpose({ modal, goals, handleSubmit, openModal })
</script>
