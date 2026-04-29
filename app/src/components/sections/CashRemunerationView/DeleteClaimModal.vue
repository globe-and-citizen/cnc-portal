<template>
  <div class="flex flex-col gap-4">
    <p>
      Are you sure you want to delete
      <span class="font-semibold">{{ formatMinutesAsDuration(claim?.minutesWorked ?? 0) }}</span>
      claim submitted on
      <span class="font-semibold">{{ formattedDate }}</span>
      ?
    </p>
    <div v-if="deleteClaimError" class="alert alert-error" data-test="delete-claim-error">
      Failed to delete claim
    </div>
    <div class="flex justify-end gap-2">
      <UButton
        color="error"
        :loading="isDeleting"
        :disabled="isDeleting"
        @click="handleDelete"
        data-test="confirm-delete-claim-button"
        label="Delete"
      />
      <UButton
        color="primary"
        variant="outline"
        :disabled="isDeleting"
        @click="$emit('close')"
        data-test="cancel-delete-claim-button"
        label="Cancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { Claim } from '@/types'
import { formatMinutesAsDuration } from '@/utils/wageUtil'

import { useDeleteClaimMutation } from '@/queries/weeklyClaim.queries'

const props = defineProps<{
  claim: Claim
}>()

const emit = defineEmits<{
  close: []
}>()

const toast = useToast()

const formattedDate = computed(() => {
  return props.claim ? dayjs(props.claim.dayWorked).format('MMM DD, YYYY') : ''
})

const {
  mutateAsync: deleteClaim,
  isPending: isDeleting,
  error: deleteClaimError
} = useDeleteClaimMutation()

const handleDelete = async () => {
  await deleteClaim({ pathParams: { claimId: props.claim.id } })
  toast.add({ title: 'Claim deleted successfully', color: 'success' })
  emit('close')
}
</script>
