<template>
  <div class="flex flex-col gap-5">
    <MultiSelectMemberInput v-model="formData" :disable-team-members="true" />

    <template v-if="addMembersError">
      <UAlert
        v-if="archivedTeamErrorMessage"
        color="warning"
        variant="soft"
        :description="archivedTeamErrorMessage"
      />
      <UAlert
        v-else-if="isUnauthorizedError"
        color="warning"
        variant="soft"
        description="You don't have permission to add members."
      />
      <UAlert v-else color="error" variant="soft" :description="addMembersErrorMessage" />
    </template>

    <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
      <UButton
        color="primary"
        class="justify-center"
        :loading="addMembersLoading"
        :disabled="addMembersLoading || archivedDisabled"
        data-test="add-members-submit"
        @click="handleAddMembers"
        label="Add Members"
      />
    </TeamArchivedTooltip>
  </div>

  <hr class="my-0" />
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import { useArchivedTeamMutationError } from '@/composables/useArchivedTeamMutationError'
import { getAxiosErrorMessage } from '@/utils/errorUtil'
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

const archivedTeamErrorMessage = useArchivedTeamMutationError(() => addMembersError.value)

const isUnauthorizedError = computed(
  () => (addMembersError.value as { response?: { status?: number } })?.response?.status === 401
)

const addMembersErrorMessage = computed(() =>
  getAxiosErrorMessage(addMembersError.value, 'Something went wrong. Unable to add members.')
)

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
