<template>
  <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>
  <!-- <LoadingButton color="primary"></LoadingButton> -->

  <div
    class="flex text-sm font-bold justify-between items-center py-6"
    v-if="!teamIsFetching && team"
  >
    <span class="text-3xl">Team Members List</span>

    <button
      v-if="team.ownerAddress == userDataStore.address"
      @click="
        () => {
          showAddMemberForm = !showAddMemberForm
        }
      "
      data-test="add-member-button"
      class="btn btn-primary w-max"
    >
      <PlusCircleIcon class="size-6" /> Add a new Member
    </button>

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
  <div class="divider m-0"></div>
  <div class="overflow-x-auto">
    <table class="table table-zebra">
      <!-- head -->
      <thead class="text-sm font-bold">
        <tr>
          <th></th>
          <th>Name</th>
          <th>Address</th>
          <th v-if="team.ownerAddress === userDataStore.address">Action</th>
        </tr>
      </thead>
      <tbody>
        <MemberRow
          v-for="(member, index) in team.members"
          :ownerAddress="team.ownerAddress"
          :teamId="Number(team.id)"
          :member="{ ...member, index }"
          :key="member.address"
          @getTeam="emits('getTeam')"
        />
      </tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { PlusCircleIcon } from '@heroicons/vue/24/outline'
import { useCustomFetch } from '@/composables/useCustomFetch'
import MemberRow from '@/components/sections/SingleTeamView/MemberRow.vue'
import AddMemberForm from '@/components/sections/SingleTeamView/forms/AddMemberForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import type { User } from '@/types'
import { useUserDataStore } from '@/stores/user'

import { useToastStore } from '@/stores/useToastStore'

const userDataStore = useUserDataStore()
const showAddMemberForm = ref(false)
const teamMembers = ref([{ name: '', address: '', isValid: false }])

const { addSuccessToast, addErrorToast } = useToastStore()

const route = useRoute()

defineProps(['team', 'teamIsFetching'])
const emits = defineEmits(['getTeam'])
const teamId = String(route.params.id)

// useFetch instance for adding members to team
const {
  execute: executeAddMembers,
  error: addMembersError,
  isFetching: addMembersLoading
} = useCustomFetch(`teams/${teamId}/member`, {
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      addErrorToast(error.message)
    } else {
      addErrorToast('An unknown error occurred')
    }
  }
}
</script>
