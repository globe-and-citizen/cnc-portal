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
        :initial-data="formInitialData"
        :is-loading="isWageClaimAdding"
        :disabled-week-starts="props.signedWeekStarts"
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
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { useQueryClient } from '@tanstack/vue-query'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useTeamStore } from '@/stores'
import type { ClaimFormData, ClaimSubmitPayload } from '@/types'

dayjs.extend(utc)

const toastStore = useToastStore()
const teamStore = useTeamStore()
const queryClient = useQueryClient()

const modal = ref(false)
const errorMessage = ref<{ message: string } | null>(null)
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
const claimPayload = ref<ClaimSubmitPayload | null>(null)

const openModal = () => {
  formInitialData.value = createDefaultFormData()
  errorMessage.value = null
  modal.value = true
}

const teamId = computed(() => teamStore.currentTeamId)

const {
  error: addWageClaimError,
  isFetching: isWageClaimAdding,
  execute: addClaim,
  response: addWageClaimResponse,
  statusCode: addWageClaimStatusCode
} = useCustomFetch('/claim', {
  immediate: false
})
  .post(() => {
    if (!claimPayload.value) {
      throw new Error('Missing claim payload')
    }
    return {
      teamId: teamId.value,
      ...claimPayload.value
    }
  })
  .json()

watch(addWageClaimError, async () => {
  if (addWageClaimError.value) {
    errorMessage.value = await addWageClaimResponse.value?.json()
  }
})

const canSubmitClaim = computed(() => {
  if (!props.weeklyClaim) return true

  return props.weeklyClaim.status === 'pending'
})

const handleSubmit = async (data: ClaimSubmitPayload) => {
  if (!teamId.value) {
    toastStore.addErrorToast('Team not selected')
    return
  }

  claimPayload.value = data
  await addClaim()

  if (addWageClaimStatusCode.value === 201) {
    toastStore.addSuccessToast('Wage claim added successfully')
    queryClient.invalidateQueries({
      queryKey: ['weekly-claims', teamStore.currentTeamId]
    })
    modal.value = false
    formInitialData.value = createDefaultFormData()
    claimPayload.value = null
    errorMessage.value = null
  }
}

defineExpose({
  handleSubmit,
  modal,
  errorMessage,
  formInitialData
})
</script>
