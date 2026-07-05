<template>
  <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
    <UTooltip :text="restrictedTooltip" :delay-duration="0">
      <span class="inline-flex max-w-full">
        <UButton
          :loading="isWageClaimAdding"
          color="success"
          size="sm"
          data-test="modal-submit-hours-button"
          :disabled="!canSubmitClaim || archivedDisabled"
          @click="openModal()"
        >
          Submit Claim
        </UButton>
      </span>
    </UTooltip>
  </TeamArchivedTooltip>

  <UModal
    v-if="modal.mount"
    v-model:open="modal.show"
    title="Submit Claim"
    :description="`Submit your hours worked for the week to receive payment. You can only submit one claim per week.`"
  >
    <template #body>
      <div class="mb-20 flex flex-col gap-4">
        <ClaimForm
          ref="claimFormRef"
          :initial-data="formInitialData"
          :is-loading="isWageClaimAdding"
          :disabled-week-starts="props.signedWeekStarts"
          :restrict-submit="isRestricted"
          :error-message="addWageClaimError && errorMessage ? errorMessage.message : ''"
          error-title="Failed to submit claim"
          @submit="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'
import { useSubmitRestriction } from '@/composables'
import { useTeamStore } from '@/stores'
import type { ClaimFormData, ClaimSubmitPayload } from '@/types'
import { useSubmitClaimMutation } from '@/queries/weeklyClaim.queries'
import { startOfWeek } from '@/utils/dayUtils'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import { getAxiosErrorMessage } from '@/utils/errorUtil'

dayjs.extend(utc)

const toast = useToast()
const teamStore = useTeamStore()
const { isRestricted, checkRestriction } = useSubmitRestriction()

const modal = ref({
  mount: false,
  show: false
})
const errorMessage = ref<{ message: string } | null>(null)
const addWageClaimError = ref(false)
const claimFormRef = ref<InstanceType<typeof ClaimForm> | null>(null)
const resolveInitialDayWorked = (selectedWeekStart?: string): string => {
  const today = dayjs.utc().startOf('day')
  if (!selectedWeekStart) return today.toISOString()

  const selectedWeek = startOfWeek(selectedWeekStart)
  const currentWeek = startOfWeek(today)
  const dayWorked = selectedWeek.isSame(currentWeek) ? today : selectedWeek.startOf('day')

  return dayWorked.toISOString()
}

const createDefaultFormData = (selectedWeekStart?: string): ClaimFormData => ({
  hoursWorked: '0',
  minutesWorked: '0',
  memo: '',
  dayWorked: resolveInitialDayWorked(selectedWeekStart)
})

const props = defineProps<{
  weeklyClaim?: {
    status: 'pending' | 'signed' | 'withdrawn' | 'disabled'
  }
  signedWeekStarts?: string[]
  selectedWeekStart?: string
}>()

const formInitialData = ref<ClaimFormData>(createDefaultFormData(props.selectedWeekStart))

const openModalWithData = (initialData: ClaimFormData) => {
  formInitialData.value = initialData
  errorMessage.value = null
  addWageClaimError.value = false
  modal.value = { mount: true, show: true }
}

const openModal = () => {
  openModalWithData(createDefaultFormData(props.selectedWeekStart))
}

const openModalForDay = (dayIso: string) => {
  openModalWithData({
    ...createDefaultFormData(props.selectedWeekStart),
    dayWorked: dayIso
  })
}

const closeModal = () => {
  claimFormRef.value?.resetForm()
  errorMessage.value = null
  addWageClaimError.value = false
  modal.value = { mount: false, show: false }
}

// Reset form (including file previews) whenever the modal is closed
watch(
  () => modal.value.show,
  (isOpen) => {
    if (!isOpen) {
      closeModal()
    }
  },
  { flush: 'post' }
)

watch(
  () => props.selectedWeekStart,
  (selectedWeekStart) => {
    formInitialData.value = createDefaultFormData(selectedWeekStart)
  }
)

const teamId = computed(() => teamStore.currentTeamId)

// Check restriction when team changes
watch(
  teamId,
  async (newTeamId) => {
    if (newTeamId) {
      await checkRestriction(newTeamId)
    }
  },
  { immediate: true }
)

// Submissions stay enabled while the team is on the previous Officer
// generation (issue #1825): submitting only creates a `pending` row that
// the approver can sign once the team migrates. Only the sign action is
// frozen — see CRSigne.vue.
// When the restriction is active, only the current ISO week can accept a
// submission, so the "Submit Claim" button is disabled on every other week
// (mirrors the calendar guard and the backend enforcement). Reuses the existing
// startOfWeek helper and the same week comparison used in ClaimHistoryActionAlerts.
const isSelectedWeekSubmittable = computed(() => {
  if (!isRestricted.value) return true
  const selected = startOfWeek(props.selectedWeekStart ?? dayjs.utc())
  return selected.isSame(startOfWeek(dayjs.utc()), 'day')
})

const canSubmitClaim = computed(() => {
  if (!isSelectedWeekSubmittable.value) return false
  if (!props.weeklyClaim) return true

  return props.weeklyClaim.status === 'pending'
})

// Tooltip shown on hover when the button is disabled specifically because the
// selected week is outside the submit window (undefined otherwise → no tooltip).
const restrictedTooltip = computed(() =>
  !isSelectedWeekSubmittable.value
    ? 'You can only submit claims for the current week, up to 4 days in the past.'
    : undefined
)

const { mutateAsync: submitClaim, isPending: isWageClaimAdding } = useSubmitClaimMutation()

const handleSubmit = async (data: ClaimSubmitPayload & { files?: File[] }) => {
  if (!teamId.value) {
    toast.add({ title: 'Team not selected', color: 'error' })
    return
  }

  addWageClaimError.value = false
  errorMessage.value = null

  try {
    // Refresh the restriction status right before submitting so a dashboard
    // change is reflected immediately (backend addClaim is the real guard).
    await checkRestriction(teamId.value)

    await submitClaim({
      ...data,
      teamId: teamId.value
    })

    toast.add({ title: 'Wage claim added successfully', color: 'success' })

    closeModal()
    formInitialData.value = createDefaultFormData(props.selectedWeekStart)
  } catch (error) {
    console.error('Error submitting claim:', error)
    errorMessage.value = {
      message: getAxiosErrorMessage(error, 'Failed to add claim')
    }
    addWageClaimError.value = true
  }
}

// Check restriction on mount
onMounted(async () => {
  if (teamId.value) {
    await checkRestriction(teamId.value)
  }
})

defineExpose({
  handleSubmit,
  modal,
  errorMessage,
  formInitialData,
  openModalForDay
})
</script>
