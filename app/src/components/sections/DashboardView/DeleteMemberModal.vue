<template>
  <div>
    <UButton
      color="error"
      size="sm"
      @click="() => (showModal = true)"
      data-test="delete-member-button"
      icon="heroicons-outline:trash"
    />

    <ModalComponent v-model="showModal" v-if="showModal">
      <p class="font-bold text-lg">Confirmation</p>
      <hr class="" />
      <p class="py-4">
        Are you sure you want to delete
        <span class="font-bold">{{ member.name }}</span>
        with address <span class="font-bold">{{ member.address }}</span>
        from the team?
      </p>

      <div class="modal-action justify-center">
        <UButton
          :loading="memberIsDeleting"
          :disabled="memberIsDeleting"
          color="error"
          @click="handleDelete"
          data-test="delete-member-confirm-button"
          label="Delete"
        />
        <UButton
          color="primary"
          variant="outline"
          @click="showModal = false"
          data-test="delete-member-cancel-button"
          label="Cancel"
        />
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
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

<style scoped></style>
