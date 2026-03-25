<template>
  <UModal v-model:open="showModal" title="Confirmation" :ui="{ content: 'rounded-2xl' }">
    <UButton
      color="error"
      size="lg"
      icon="heroicons-outline:trash"
      data-test="delete-member-button"
      @click="showModal = true"
    />

    <template #body>
      <p class="py-4">
        Are you sure you want to delete
        <span class="font-bold">{{ member.name }}</span>
        with address <span class="font-bold">{{ member.address }}</span>
        from the team?
      </p>

      <div class="flex justify-center gap-2">
        <UButton
          :loading="memberIsDeleting"
          :disabled="memberIsDeleting"
          color="error"
          @click="handleDelete"
          data-test="delete-member-confirm-button"
          >Delete</UButton
        >
        <UButton
          color="primary"
          variant="outline"
          @click="showModal = false"
          data-test="delete-member-cancel-button"
        >
          Cancel
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToastStore } from '@/stores'
import type { Member } from '@/types'
import { useDeleteMemberMutation } from '@/queries/member.queries'
import type { AxiosError } from 'axios'

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
}>()

const emits = defineEmits<{
  memberDeleted: []
}>()

const showModal = ref(false)

const { mutate: executeDeleteMember, isPending: memberIsDeleting } = useDeleteMemberMutation()

const { addSuccessToast, addErrorToast } = useToastStore()

const handleDelete = (): void => {
  executeDeleteMember(
    {
      pathParams: {
        teamId: props.teamId,
        memberAddress: props.member.address || ''
      }
    },
    {
      onSuccess: () => {
        addSuccessToast('Member deleted successfully')
        showModal.value = false
        emits('memberDeleted')
      },
      onError: (error: AxiosError) => {
        const err = error as AxiosError<{ message?: string }>
        addErrorToast(err.response?.data?.message || 'Failed to delete member')
      }
    }
  )
}
</script>
