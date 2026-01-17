<template>
  <div>
    <ButtonUI
      variant="error"
      size="sm"
      @click="() => (showModal = true)"
      data-test="delete-member-button"
    >
      <IconifyIcon icon="heroicons-outline:trash" class="size-4" />
    </ButtonUI>

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
        <ButtonUI
          :loading="memberIsDeleting"
          :disabled="memberIsDeleting"
          variant="error"
          @click="handleDelete"
          data-test="delete-member-confirm-button"
          >Delete</ButtonUI
        >
        <ButtonUI
          variant="primary"
          outline
          @click="showModal = false"
          data-test="delete-member-cancel-button"
        >
          Cancel
        </ButtonUI>
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
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

const { mutate: executeDeleteMember, isPending: memberIsDeleting } = useDeleteMemberMutation(
  props.teamId,
  props.member.address || ''
)

const { addSuccessToast, addErrorToast } = useToastStore()

const handleDelete = (): void => {
  executeDeleteMember(undefined, {
    onSuccess: () => {
      addSuccessToast('Member deleted successfully')
      showModal.value = false
      emits('memberDeleted')
    },
    onError: (error: AxiosError) => {
      const err = error as AxiosError<{ message?: string }>
      addErrorToast(err.response?.data?.message || 'Failed to delete member')
    }
  })
}
</script>

<style scoped></style>
