<template>
  <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>

  <div
    class="bg-base-100 flex h-16 items-center rounded-xl text-sm font-bold justify-between px-4 w-full"
    v-if="!teamIsFetching && team"
  >
    <span class="w-1/2">Name</span>
    <span class="w-1/2">Address</span>
    <AddMemberCard
      class="w-1/2"
      v-if="team.ownerAddress == useUserDataStore().address"
      @toggleAddMemberModal="showAddMemberForm = !showAddMemberForm"
    />
    <ModalComponent v-model="showAddMemberForm">
      <AddMemberForm
        :isLoading="addMembersLoading"
        :users="foundUsers"
        :formData="teamMembers"
        @searchUsers="(input) => searchUsers(input)"
        @addMembers="handleAddMembers"
      />
    </ModalComponent>
  </div>
  <MemberCard
    v-for="member in team.members"
    :ownerAddress="team.ownerAddress"
    :teamId="Number(team.id)"
    :member="member"
    :key="member.address"
    @getTeam="emits('getTeam')"
  />
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import MemberCard from '@/components/sections/SingleTeamView/Team/MemberCard.vue'
import AddMemberCard from '@/components/sections/SingleTeamView/Team/AddMemberCard.vue'
import AddMemberForm from '@/components/sections/SingleTeamView/Team/forms/AddMemberForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import type { User } from '@/types'
import { useUserDataStore } from '@/stores/user'

import { useToastStore } from '@/stores/useToastStore'
import { useRoute } from 'vue-router'

const showAddMemberForm = ref(false)
const teamMembers = ref([{ name: '', address: '', isValid: false }])

const { addSuccessToast, addErrorToast } = useToastStore()

const route = useRoute()

defineProps(['team', 'teamIsFetching'])
const emits = defineEmits(['getTeam'])
// useFetch instance for adding members to team
const {
  execute: executeAddMembers,
  error: addMembersError,
  isFetching: addMembersLoading
} = useCustomFetch(`teams/${String(route.params.id)}/member`, {
  immediate: false
})
  .post({ data: teamMembers.value })
  .json()
// Watchers for adding members to team
watch(addMembersError, () => {
  if (addMembersError.value) {
    addErrorToast(addMembersError.value || 'Failed to add members')
  }
})
watch([() => addMembersLoading.value, () => addMembersError.value], async () => {
  if (!addMembersLoading.value && !addMembersError.value) {
    addSuccessToast('Members added successfully')
    teamMembers.value = [{ name: '', address: '', isValid: false }]
    foundUsers.value = []
    emits('getTeam')
    showAddMemberForm.value = false
  }
})

const handleAddMembers = async () => {
  await executeAddMembers()
}

const searchUserName = ref('')
const searchUserAddress = ref('')
const foundUsers = ref<User[]>([])

const {
  execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch('user/search', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    const params = new URLSearchParams()
    if (!searchUserName.value && !searchUserAddress.value) return
    if (searchUserName.value) params.append('name', searchUserName.value)
    if (searchUserAddress.value) params.append('address', searchUserAddress.value)
    url += '?' + params.toString()
    return { options, url, cancel }
  }
})
  .get()
  .json()

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})
const searchUsers = async (input: { name: string; address: string }) => {
  try {
    searchUserName.value = input.name
    searchUserAddress.value = input.address
    if (searchUserName.value || searchUserAddress.value) {
      await executeSearchUser()
    }
  } catch (error: any) {
    addErrorToast(error.message)
  }
}
</script>
