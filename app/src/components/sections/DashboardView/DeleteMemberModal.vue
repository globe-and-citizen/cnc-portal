<template>
  <UModal v-model:open="showModal" title="Remove Member" :ui="{ content: 'rounded-2xl' }">
    <UTooltip text="Remove member" :delay-duration="0">
      <UButton
        color="error"
        size="lg"
        icon="heroicons-outline:trash"
        data-test="delete-member-button"
        @click="showModal = true"
      />
    </UTooltip>

    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex justify-center py-2">
          <UserComponent :user="member" isDetailedView />
        </div>

        <USeparator />

        <UAlert
          color="warning"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          :title="`Remove ${member.name} from the team?`"
          description="This action cannot be undone."
        />

        <UAlert
          v-if="deleteError"
          color="error"
          variant="soft"
          :description="(deleteError as AxiosError<{ message?: string }>).response?.data?.message ?? 'Failed to remove member'"
          data-test="delete-member-error"
        />

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="showModal = false"
            data-test="delete-member-cancel-button"
          >
            Cancel
          </UButton>
          <UButton
            :loading="memberIsDeleting"
            :disabled="memberIsDeleting"
            color="error"
            @click="handleDelete"
            data-test="delete-member-confirm-button"
            >Remove</UButton
          >
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Member } from '@/types'
import { useDeleteMemberMutation } from '@/queries/member.queries'
import UserComponent from '@/components/UserComponent.vue'
import type { AxiosError } from 'axios'

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
}>()

const emits = defineEmits<{
  memberDeleted: []
}>()

const showModal = ref(false)

const toast = useToast()
const { mutate: executeDeleteMember, isPending: memberIsDeleting, error: deleteError } = useDeleteMemberMutation()

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
        toast.add({ title: 'Member removed successfully', color: 'success' })
        showModal.value = false
        emits('memberDeleted')
      }
    }
  )
}
</script>
