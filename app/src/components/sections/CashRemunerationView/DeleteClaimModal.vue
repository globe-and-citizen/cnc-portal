<template>
  <div class="flex flex-col gap-4">
    <h3 class="text-xl font-bold">Delete Claim</h3>
    <hr />
    <p>
      Are you sure you want to delete
      <span class="font-semibold">{{ claim?.hoursWorked }} h</span>
      claims submitted on
      <span class="font-semibold">{{ formattedDate }}</span>
      ?
    </p>
    <div v-if="errorMessage" class="alert alert-error" data-test="delete-claim-error">
      {{ errorMessage }}
    </div>
    <div class="flex justify-end gap-2">
      <ButtonUI
        variant="error"
        :loading="isDeleting"
        :disabled="isDeleting"
        @click="handleDelete"
        data-test="confirm-delete-claim-button"
      >
        Delete
      </ButtonUI>
      <ButtonUI
        variant="primary"
        outline
        :disabled="isDeleting"
        @click="$emit('close')"
        data-test="cancel-delete-claim-button"
      >
        Cancel
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import type { Claim } from '@/types'

import ButtonUI from '@/components/ButtonUI.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useTeamStore } from '@/stores'
import { useQueryClient } from '@tanstack/vue-query'

const props = defineProps<{
  claim: Claim
}>()

const emit = defineEmits<{
  close: []
}>()

const toastStore = useToastStore()
const teamStore = useTeamStore()
const queryClient = useQueryClient()

const formattedDate = computed(() => {
  return props.claim ? dayjs(props.claim.dayWorked).format('MMM DD, YYYY') : ''
})

const deleteClaimEndpoint = computed(() => `/claim/${props.claim.id}`)
const errorMessage = ref<string>('')

const {
  execute: deleteClaimRequest,
  isFetching: isDeleting,
  error: deleteClaimError,
  statusCode: deleteClaimStatusCode,
  response: deleteClaimResponse
} = useCustomFetch(deleteClaimEndpoint, {
  immediate: false
})
  .delete()
  .json()

const handleDelete = async () => {
  errorMessage.value = ''
  await deleteClaimRequest()

  if (deleteClaimStatusCode.value === 200) {
    toastStore.addSuccessToast('Claim deleted successfully')

    // Invalidate using the same query key pattern from parent
    await queryClient.invalidateQueries({
      queryKey: ['weekly-claims', teamStore.currentTeam?.id]
    })

    emit('close')
  }
}

watch(deleteClaimError, async () => {
  if (!deleteClaimError.value || !deleteClaimResponse.value) return

  try {
    const errorData = await deleteClaimResponse.value.json()
    errorMessage.value = errorData?.message || 'Failed to delete claim'
  } catch (error) {
    console.error('Failed to parse delete claim error response', error)
    errorMessage.value = 'Failed to delete claim'
  }

  toastStore.addErrorToast(errorMessage.value)
})
</script>
