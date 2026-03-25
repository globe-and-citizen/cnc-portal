<template>
  <ButtonUI
    :loading="isWageClaimAdding"
    variant="success"
    size="sm"
    data-test="modal-submit-hours-button"
    :disabled="!canSubmitClaim"
    @click="openModal()"
  >
    Submit Claim
  </ButtonUI>

  <ModalComponent v-if="modal.mount" v-model="modal.show" @reset="closeModal">
    <div class="flex flex-col gap-4 mb-20">
      <h3 class="text-xl font-bold">Submit Claim</h3>
      <hr />
      <ClaimForm
        ref="claimFormRef"
        :initial-data="formInitialData"
        :is-loading="isWageClaimAdding"
        :disabled-week-starts="props.signedWeekStarts"
        :restrict-submit="isRestricted"
        @submit="handleSubmit"
      />
      <div v-if="addWageClaimError && errorMessage" class="mt-4">
        <div role="alert" class="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{{ errorMessage.message }}</span>
        </div>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'
import { useSubmitRestriction } from '@/composables'
import { useToastStore, useTeamStore } from '@/stores'
import type { ClaimFormData, ClaimSubmitPayload } from '@/types'
import { useSubmitClaimMutation } from '@/queries/weeklyClaim.queries'

dayjs.extend(utc)

const toastStore = useToastStore()
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
  hoursWorked: '',
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
    toastStore.addErrorToast('Team not selected')
    return
  }

  addWageClaimError.value = false
  errorMessage.value = null

  try {
    await submitClaim({
      ...data,
      teamId: teamId.value
    })

    toastStore.addSuccessToast('Wage claim added successfully')

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
