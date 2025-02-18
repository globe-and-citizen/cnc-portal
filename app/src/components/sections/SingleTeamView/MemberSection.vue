<template>
  <CardComponent title="Team Members List">
    <template #card-action>
      <ButtonUI
        v-if="team.ownerAddress == userDataStore.address"
        @click="
          () => {
            showAddMemberForm = !showAddMemberForm
          }
        "
        data-test="add-member-button"
        variant="primary"
        class="w-max"
      >
        <PlusCircleIcon class="size-6" /> Add a new Member
      </ButtonUI>
      <ModalComponent v-model="showAddMemberForm">
        <AddMemberForm
          :isLoading="addMembersLoading"
          :users="foundUsers"
          :formData="teamMembers"
          @searchUsers="(input) => searchUsers(input)"
          @addMembers="handleAddMembers"
        />
      </ModalComponent>
    </template>
    <template #default>
      <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>
      <div class="divider m-0"></div>
      <div class="overflow-x-auto">
        <TableComponent
          :rows="team.members"
          :columns="columns"
          :loading="teamIsFetching"
          data-test="members-table"
        >
          <template #member-data="{ row }">
            <UserComponent
              :user="{ name: row.name, address: row.address, avatarUrl: row.avatarUrl }"
            />
          </template>
          <template #wage-data=""> 20 h/week & 10 USD/h </template>
          <template #action-data="{ row }" v-if="team.ownerAddress === userDataStore.address">
            <div class="flex flex-wrap gap-2">
              <ButtonUI
                variant="error"
                size="sm"
                @click="() => (row.showDeleteMemberConfirmModal = true)"
                data-test="delete-member-button"
              >
                <TrashIcon class="size-4" />
              </ButtonUI>
              <ButtonUI
                size="sm"
                variant="success"
                @click="() => (row.showSetMemberWageModal = true)"
                data-test="set-wage-button"
              >
                Set Wage
              </ButtonUI>
            </div>
          </template>
        </TableComponent>
      </div>
    </template>
  </CardComponent>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { PlusCircleIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useCustomFetch } from '@/composables/useCustomFetch'
import AddMemberForm from '@/components/sections/SingleTeamView/forms/AddMemberForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import type { User } from '@/types'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import UserComponent from '@/components/UserComponent.vue'

const userDataStore = useUserDataStore()
const showAddMemberForm = ref(false)
const teamMembers = ref([{ name: '', address: '', isValid: false }])

const { addSuccessToast, addErrorToast } = useToastStore()
const route = useRoute()

defineProps(['team', 'teamIsFetching'])
const emits = defineEmits(['getTeam'])
const teamId = String(route.params.id)

const {
  execute: executeAddMembers,
  error: addMembersError,
  isFetching: addMembersLoading
} = useCustomFetch(`teams/${teamId}/member`, { immediate: false })
  .post({ data: teamMembers.value })
  .json()

const {
  execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch('user/search', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    const params = new URLSearchParams()
    if (lastUpdatedInput.value === 'name' && searchUserName.value) {
      params.append('name', searchUserName.value)
    } else if (lastUpdatedInput.value === 'address' && searchUserAddress.value) {
      params.append('address', searchUserAddress.value)
    }
    url += '?' + params.toString()
    return { options, url, cancel }
  }
})
  .get()
  .json()

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
const lastUpdatedInput = ref<'name' | 'address'>('name')

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})

const searchUsers = async (input: { name: string; address: string }) => {
  try {
    if (input.name !== searchUserName.value) {
      searchUserName.value = input.name
      lastUpdatedInput.value = 'name'
    }
    if (input.address !== searchUserAddress.value) {
      searchUserAddress.value = input.address
      lastUpdatedInput.value = 'address'
    }
    await executeSearchUser()
  } catch (error: unknown) {
    if (error instanceof Error) {
      addErrorToast(error.message)
    } else {
      addErrorToast('An unknown error occurred')
    }
  }
}

const columns = ref([
  { key: 'index', label: '#' },
  { key: 'member', label: 'Member' },
  { key: 'wage', label: 'Wage' },
  { key: 'action', label: 'Action', sortable: false }
])
</script>
