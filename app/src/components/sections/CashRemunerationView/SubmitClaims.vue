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

  <ModalComponent v-model="modal">
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
import { useQueryClient } from '@tanstack/vue-query'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'
import { useSubmitRestriction } from '@/composables'
import { useToastStore, useTeamStore } from '@/stores'
import type { ClaimFormData, ClaimSubmitPayload } from '@/types'
import { BACKEND_URL } from '@/constant'
import { useStorage } from '@vueuse/core'

dayjs.extend(utc)

const toastStore = useToastStore()
const teamStore = useTeamStore()
const queryClient = useQueryClient()
const { isRestricted, checkRestriction } = useSubmitRestriction()

const modal = ref(false)
const errorMessage = ref<{ message: string } | null>(null)
const addWageClaimError = ref(false)
const isWageClaimAdding = ref(false)
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
const authToken = useStorage('authToken', '')

const openModal = () => {
  formInitialData.value = createDefaultFormData()
  errorMessage.value = null
  addWageClaimError.value = false
  modal.value = true
}

// Reset form (including file previews) whenever the modal is closed
watch(
  modal,
  (isOpen) => {
    if (!isOpen) {
      claimFormRef.value?.resetForm()
      errorMessage.value = null
      addWageClaimError.value = false
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

// Modified to handle file uploads via multipart/form-data
const handleSubmit = async (data: ClaimSubmitPayload & { files?: File[] }) => {
  if (!teamId.value) {
    toastStore.addErrorToast('Team not selected')
    return
  }

  isWageClaimAdding.value = true
  addWageClaimError.value = false

  try {
    const formData = new FormData()
    formData.append('teamId', teamId.value.toString())
    formData.append('hoursWorked', data.hoursWorked.toString())
    formData.append('memo', data.memo)
    formData.append('dayWorked', data.dayWorked)

    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file)
      })
    }

    const response = await fetch(`${BACKEND_URL}/api/claim`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken.value}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to add claim' }))
      throw new Error(errorData.message || 'Failed to add claim')
    }

    toastStore.addSuccessToast('Wage claim added successfully')
    queryClient.invalidateQueries({
      queryKey: ['weekly-claims', teamStore.currentTeamId]
    })
    modal.value = false
    formInitialData.value = createDefaultFormData()
    errorMessage.value = null
    addWageClaimError.value = false

    claimFormRef.value?.resetForm()
  } catch (error) {
    console.error('Error submitting claim:', error)
    const errorMsg = error instanceof Error ? error.message : 'Failed to add claim'
    toastStore.addErrorToast(errorMsg)
    errorMessage.value = { message: errorMsg }
    addWageClaimError.value = true
  } finally {
    isWageClaimAdding.value = false
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
