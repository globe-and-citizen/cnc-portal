<template>
  <div class="flex flex-col gap-5">
    <MultiSelectMemberInput v-model="formData" :disable-team-members="true" />

    <template v-if="addMembersError">
      <UAlert
        v-if="addMembersError?.status === 401"
        color="warning"
        variant="soft"
        description="You don't have permission to add members."
      />
      <UAlert
        v-else
        color="error"
        variant="soft"
        description="Something went wrong. Unable to add members."
      />
    </template>

    <UButton
      color="primary"
      block
      size="xl"
      :loading="addMembersLoading"
      :disabled="addMembersLoading"
      @click="handleAddMembers"
      >Add Members</UButton
    >
  </div>

  <hr class="my-0" />
</template>
<script setup lang="ts">
import { ref } from 'vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import type { Member } from '@/types'
import { useAddMembersMutation, type MemberInput } from '@/queries/member.queries'
import { log } from '@/utils/generalUtil'

const emits = defineEmits(['memberAdded'])
const toast = useToast()

const props = defineProps<{
  teamId: string | number
}>()

const formData = ref<Array<Member>>([])

const {
  mutate: executeAddMembers,
  isPending: addMembersLoading,
  error: addMembersError
} = useAddMembersMutation()

const handleAddMembers = async () => {
  executeAddMembers(
    {
      pathParams: { teamId: props.teamId },
      body: formData.value.map(({ address, name }) => ({
        address,
        name
      })) as unknown as MemberInput[]
    },
    {
      onSuccess: () => {
        toast.add({ title: 'Members added successfully', color: 'success' })
        formData.value = []
        emits('memberAdded')
      },
      onError: (error: unknown) => {
        log.error('AddMemberForm - handleAddMembers error:', error)
      }
    }
  )
}
</script>
