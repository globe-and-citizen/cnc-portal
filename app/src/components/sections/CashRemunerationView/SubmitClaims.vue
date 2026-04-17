<template>
  <UButton
    :loading="isWageClaimAdding"
    color="success"
    size="sm"
    data-test="modal-submit-hours-button"
    :disabled="!canSubmitClaim"
    @click="openModal()"
  >
    Submit Claim
  </UButton>

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
          @submit="handleSubmit"
        />
        <UAlert
          v-if="addWageClaimError && errorMessage"
          color="error"
          variant="soft"
          icon="i-heroicons-x-circle"
          title="Failed to submit claim"
          :description="errorMessage.message"
          class="mt-4"
          data-test="submit-claim-error"
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
const createDefaultFormData = (): ClaimFormData => ({
  hoursWorked: '0',
  minutesWorked: '0',
  memo: '',
  dayWorked: dayjs().utc().startOf('day').toISOString()
})

const props = defineProps<{
  weeklyClaim?: {
    status: 'pending' | 'signed' | 'withdrawn' | 'disabled'
  }
  signedWeekStarts?: string[]
}>()

const formInitialData = ref<ClaimFormData>(createDefaultFormData())

const openModal = () => {
  formInitialData.value = createDefaultFormData()
  errorMessage.value = null
  addWageClaimError.value = false
  modal.value = { mount: true, show: true }
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

const canSubmitClaim = computed(() => {
  if (!props.weeklyClaim) return true

  return props.weeklyClaim.status === 'pending'
})

const { mutateAsync: submitClaim, isPending: isWageClaimAdding } = useSubmitClaimMutation()

const handleSubmit = async (data: ClaimSubmitPayload & { files?: File[] }) => {
  if (!teamId.value) {
    toast.add({ title: 'Team not selected', color: 'error' })
    return
  }

  addWageClaimError.value = false
  errorMessage.value = null

  try {
    await submitClaim({
      ...data,
      teamId: teamId.value
    })

    toast.add({ title: 'Wage claim added successfully', color: 'success' })

    closeModal()
    formInitialData.value = createDefaultFormData()
  } catch (error) {
    console.error('Error submitting claim:', error)
    const backendMessage = (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message
    const message =
      backendMessage ?? (error instanceof Error ? error.message : 'Failed to add claim')
    errorMessage.value = { message }
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
  formInitialData
})
</script>
