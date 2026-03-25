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
      <p class="py-4">
        Are you sure you want to remove
        <span class="font-bold">{{ member.name }}</span>
        (<span class="font-bold">{{ formattedAddress }}</span
        >) from the team? This action cannot be undone.
      </p>

      <UAlert
        v-if="deleteError"
        color="error"
        variant="soft"
        :description="(deleteError as AxiosError<{ message?: string }>).response?.data?.message ?? 'Failed to remove member'"
        class="mb-4"
        data-test="delete-member-error"
      />

      <div class="flex justify-center gap-2">
        <UButton
          :loading="memberIsDeleting"
          :disabled="memberIsDeleting"
          color="error"
          @click="handleDelete"
          data-test="delete-member-confirm-button"
          >Remove</UButton
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
import { ref, computed } from 'vue'
import type { Member } from '@/types'
import { useDeleteMemberMutation } from '@/queries/member.queries'
import { formatAddress } from '@/utils/formatAddress'
import type { AxiosError } from 'axios'

const props = defineProps<{
  member: Partial<Member>
  teamId: number | string
}>()

const emits = defineEmits<{
  memberDeleted: []
}>()

const showModal = ref(false)
const formattedAddress = computed(() => formatAddress(props.member.address ?? ''))

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
