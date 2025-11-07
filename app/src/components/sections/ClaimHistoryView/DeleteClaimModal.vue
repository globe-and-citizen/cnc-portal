<template>
  <ModalComponent v-model="showModal">
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
          @click="handleClose"
          data-test="cancel-delete-claim-button"
        >
          Cancel
        </ButtonUI>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import type { Claim } from '@/types'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'
import { useQueryClient } from '@tanstack/vue-query'

interface Props {
  claim: Claim | null
  queryKey: Array<string | undefined>
}

const showModal = ref(true)
const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  close: []
}>()

// Store instances
const toastStore = useToastStore()
const queryClient = useQueryClient()

// Computed
const formattedDate = computed(() => {
  return props.claim ? dayjs(props.claim.dayWorked).format('MMM DD, YYYY') : ''
})

const deleteClaimEndpoint = computed(() => (props.claim ? `/claim/${props.claim.id}` : ''))

// State
const errorMessage = ref<string>('')

// API call setup
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

// Methods
const handleClose = () => {
  errorMessage.value = ''
  emit('update:show', false)
  emit('close')
}

const handleDelete = async () => {
  if (!props.claim) return

  errorMessage.value = ''

  try {
    await deleteClaimRequest()
    if (deleteClaimStatusCode.value === 200) {
      toastStore.addSuccessToast('Claim deleted successfully')
      if (props.queryKey.some((key) => key !== undefined)) {
        await queryClient.invalidateQueries({
          queryKey: props.queryKey
        })
      }
      handleClose()
    }
  } catch (error) {
    console.error('Failed to delete claim:', error)
    toastStore.addErrorToast((error as Error)?.message || 'Failed to delete claim')
  }
}

// Error handling
watch(deleteClaimError, async () => {
  if (deleteClaimError.value && deleteClaimResponse.value) {
    try {
      const errorData = await deleteClaimResponse.value.json()
      errorMessage.value = errorData.message
    } catch (err) {
      errorMessage.value = 'Failed to delete claim'
      console.error('Failed to parse delete claim error response', err)
    }
  }
})
</script>
