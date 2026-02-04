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
    <div v-if="deleteClaimError" class="alert alert-error" data-test="delete-claim-error">
      Failed to delete claim
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
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { Claim } from '@/types'

import ButtonUI from '@/components/ButtonUI.vue'
import { useDeleteClaimMutation } from '@/queries/weeklyClaim.queries'
import { useToastStore } from '@/stores'

const props = defineProps<{
  claim: Claim
}>()

const emit = defineEmits<{
  close: []
}>()

const toastStore = useToastStore()

const formattedDate = computed(() => {
  return props.claim ? dayjs(props.claim.dayWorked).format('MMM DD, YYYY') : ''
})

const {
  mutateAsync: deleteClaim,
  isPending: isDeleting,
  error: deleteClaimError
} = useDeleteClaimMutation()

const handleDelete = async () => {
  await deleteClaim({ claimId: props.claim.id })
  toastStore.addSuccessToast('Claim deleted successfully')
  emit('close')
}
</script>
