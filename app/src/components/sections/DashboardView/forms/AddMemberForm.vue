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
      @click="
        async () => {
          await executeAddMembers()
        }
      "
      >Add Members</ButtonUI
    >
  </div>

  <div class="divider m-0"></div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'
import type { User } from '@/types'

const emits = defineEmits(['memberAdded'])
const { addSuccessToast, addErrorToast } = useToastStore()
// const teamStore = useTeamStore()

const props = defineProps<{
  teamId: string | number
}>()

const formData = ref<Array<Pick<User, 'address' | 'name'>>>([])

const membersAddress = computed(() =>
  formData.value.map((member) => {
    return { address: member.address }
  })
)
const {
  execute: executeAddMembers,
  error: addMembersError,
  isFetching: addMembersLoading,
  statusCode
} = useCustomFetch(`teams/${props.teamId}/member`, { immediate: false })
  .post(membersAddress)
  .json<{ member: string }>()

watch(addMembersError, () => {
  if (addMembersError.value) {
    addErrorToast(addMembersError.value || 'Failed to add members')
  }
})

watch(addMembersLoading, () => {
  if (!addMembersLoading.value && !addMembersError.value) {
    addSuccessToast('Members added successfully')
    emits('memberAdded')
  }
})
</script>
