<template>
  <h1 class="font-bold text-2xl">Add New Member</h1>
  <hr />
  <div class="flex flex-col gap-5 pt-5">
    <MultiSelectMemberInput v-model="formData" :disable-team-members="true" />

    <div v-if="addMembersError">
      <div class="alert alert-warning" v-if="statusCode === 401">
        You don't have the right for this
      </div>
      <div class="alert alert-danger" v-else>Something went wrong, Unable to add team Members</div>
    </div>

    <ButtonUI
      variant="primary"
      class="justify-center"
      :loading="addMembersLoading"
      :disabled="addMembersLoading"
      @click="handleAddMembers"
      >Add Members</ButtonUI
    >
  </div>

  <div class="divider m-0"></div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { useToastStore } from '@/stores'
import type { Member } from '@/types'
import { useAddMembers, type MemberInput } from '@/queries/member.queries'

const emits = defineEmits(['memberAdded'])
const { addSuccessToast, addErrorToast } = useToastStore()

const props = defineProps<{
  teamId: string | number
}>()

const formData = ref<Array<Member>>([])

const {
  mutate: executeAddMembers,
  isPending: addMembersLoading,
  error: addMembersError
} = useAddMembers(props.teamId)

const statusCode = ref<number | null>(null)

const handleAddMembers = async () => {
  executeAddMembers(
    formData.value.map(({ address, name }) => ({ address, name })) as unknown as MemberInput[],
    {
      onSuccess: () => {
        addSuccessToast('Members added successfully')
        formData.value = []
        statusCode.value = 201
        emits('memberAdded')
      },
      onError: (error: unknown) => {
        let status = null
        let errorMessage = 'Failed to add members'
        if (
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: unknown }).response === 'object' &&
          (error as { response?: unknown }).response !== null
        ) {
          const response = (error as { response: { status?: number; data?: { message?: string } } })
            .response
          status = response.status ?? null
          errorMessage = response.data?.message ?? errorMessage
        }
        statusCode.value = status
        addErrorToast(errorMessage)
      }
    }
  )
}
</script>
