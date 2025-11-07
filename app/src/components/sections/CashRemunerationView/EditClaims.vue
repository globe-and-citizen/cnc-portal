<template>
  <ModalComponent v-model="showModal">
    <div class="flex flex-col gap-4 mb-20">
      <h3 class="text-xl font-bold">Edit Claim</h3>
      <hr />
      <ClaimForm
        :initial-data="claimFormInitialData"
        :is-edit="true"
        :is-loading="isUpdating"
        @submit="updateClaim"
        @cancel="closeModal"
      />
      <div v-if="updateClaimError && errorMessage" class="mt-4">
        <div role="alert" class="alert alert-error" data-test="edit-claim-error">
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
import { computed, ref, watch } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ClaimForm from './Form/ClaimForm.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'
import type { Claim, ClaimFormData, ClaimSubmitPayload } from '@/types'
import { useQueryClient } from '@tanstack/vue-query'

const props = defineProps<{
  claim: Claim
  teamId: number | string
}>()

const emit = defineEmits<{
  close: []
}>()

const showModal = ref(true)
const errorMessage = ref<{ message: string } | null>(null)
const toastStore = useToastStore()
const queryClient = useQueryClient()

const claimFormInitialData = computed<ClaimFormData>(() => ({
  hoursWorked: String(props.claim.hoursWorked ?? ''),
  memo: props.claim.memo ?? '',
  dayWorked: props.claim.dayWorked
}))

const updatePayload = ref<ClaimSubmitPayload | null>(null)

const {
  execute: updateClaimRequest,
  isFetching: isUpdating,
  error: updateClaimError,
  statusCode: updateClaimStatusCode,
  response: updateClaimResponse
} = useCustomFetch(`/claim/${props.claim.id}`, {
  immediate: false
})
  .put(() => {
    if (!updatePayload.value) {
      throw new Error('Missing claim payload')
    }
    return {
      hoursWorked: updatePayload.value.hoursWorked,
      memo: updatePayload.value.memo,
      dayWorked: updatePayload.value.dayWorked
    }
  })
  .json()

const closeModal = () => {
  showModal.value = false
  emit('close')
}

watch(updateClaimError, async () => {
  if (updateClaimError.value) {
    errorMessage.value = await updateClaimResponse.value?.json()
  }
})

const updateClaim = async (data: ClaimSubmitPayload) => {
  updatePayload.value = data
  errorMessage.value = null
  try {
    await updateClaimRequest()
    if (updateClaimStatusCode.value === 200) {
      toastStore.addSuccessToast('Claim updated successfully')

      await queryClient.invalidateQueries({
        queryKey: ['weekly-claims', props.teamId]
      })

      closeModal()
    }
  } catch (error) {
    console.error('Failed to update claim:', error)
    toastStore.addErrorToast((error as Error)?.message || 'Failed to update claim')
  }
}

watch(showModal, (newVal) => {
  if (!newVal) {
    emit('close')
  }
})
</script>
