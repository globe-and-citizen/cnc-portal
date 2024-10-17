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
    :is-adding-role="isAddingRole"
    :ownerAddress="team.ownerAddress"
    :teamId="Number(team.id)"
    :member="member"
    :member-teams-data="getMemberTeamsData(member.address)"
    :key="member.address"
    @getTeam="emits('getTeam')"
    @add-roles="addRoles(member)"
  />
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import MemberCard from '@/components/sections/SingleTeamView/MemberCard.vue'
import AddMemberCard from '@/components/sections/SingleTeamView/AddMemberCard.vue'
import AddMemberForm from '@/components/sections/SingleTeamView/forms/AddMemberForm.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import type { User, MemberInput, RoleCategory, Role, MemberTeamsData } from '@/types'
import { useUserDataStore } from '@/stores/user'

import { useToastStore } from '@/stores/useToastStore'
import { useRoute } from 'vue-router'
import { log, parseError } from '@/utils'
import { useVuelidate } from '@vuelidate/core'

const showAddMemberForm = ref(false)
const teamMembers = ref([{ name: '', address: '', isValid: false }])
const isAddingRole = ref(false)
const v$ = useVuelidate()

const { addSuccessToast, addErrorToast } = useToastStore()

const route = useRoute()

const { team, teamIsFetching } = defineProps(['team', 'teamIsFetching'])
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      addErrorToast(error.message)
    } else {
      addErrorToast('An unknown error occurred')
    }
  }
}

const { execute: executeFetchRoleCategories, data: _roleCategories } = useCustomFetch(
  'role-category',
  {
    immediate: false
  }
)
  .get()
  .json()

const getMemberTeamsData = (userAddress: string) => {
  const emptyMemberTeamsData: MemberTeamsData = {
    userAddress,
    roles: [{
      id: 0,
      roleId: 0,
      role: {
        name: '',
        roleCategoryId: 0
      }
    }]
  }
  const memberTeamsData = team.memberTeamsData.find((item: MemberTeamsData) => item.userAddress === userAddress)
  return memberTeamsData? memberTeamsData: emptyMemberTeamsData
}

const createContract = async (member: Partial<MemberInput>) => {
  let contract
  if (member.roles)
    for (const memberRole of member.roles) {
      await executeFetchRoleCategories()
      const roleCategory = _roleCategories.value.roleCategories.find(
        (category: RoleCategory) =>
          //@ts-ignore
          category.id === memberRole.role.roleCategoryId
      )

      if (roleCategory && roleCategory.roles) {
        const role = roleCategory.roles.find(
          (_role: Role) =>
            //@ts-ignore
            _role.id === memberRole.roleId
        )

        const entitlements = []

        if (role && role.entitlements) {
          for (const entitlement of role.entitlements) {
            if (
              entitlement.entitlementType &&
              entitlement.entitlementType.name === 'access' &&
              entitlement.value.split(':')[0] === 'expense-account'
            ) {
              entitlements.push(entitlement.value)
            }
          }

          if (entitlements.length > 0) {
            contract = {
              role: {
                name: role.name,
                entitlement: {
                  name: 'access',
                  resource: entitlements[0].split(':')[0],
                  accessLevel: entitlements[0].split(':')[1]
                }
              },
              assignedTo: member.address,
              assignedBy: useUserDataStore().address
            }
          }
        }
      }
    }
  return contract
}

const signContract = async (contract: undefined | Object) => {
  if (!contract) return
  const params = [
    useUserDataStore().address,
    {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' }
        ],
        Entitlement: [
          { name: 'name', type: 'string' },
          { name: 'resource', type: 'string' },
          { name: 'accessLevel', type: 'string' }
        ],
        Role: [
          { name: 'name', type: 'string' },
          { name: 'entitlement', type: 'Entitlement' }
        ],
        Contract: [
          { name: 'assignedTo', type: 'address' },
          { name: 'assignedBy', type: 'address' },
          { name: 'role', type: 'Role' }
        ]
      },
      primaryType: 'Contract',
      domain: {
        name: 'CNC Contract',
        version: '1'
      },
      message: contract
    }
  ]
  try {
    //@ts-ignore
    return await window.ethereum.request({ method: 'eth_signTypedData_v4', params: params })
  } catch (error) {
    log.error(parseError(error))
  }
}

const memberRolesData = ref<{}>()

const { execute: executeCreateMemberRoles } = useCustomFetch(`teams/${team.id}/member/add-roles`, {
  immediate: false
})
  .post(memberRolesData)
  .json()

const addRoles = async (member: Partial<MemberInput>) => {
  isAddingRole.value = true
  if (v$.value.$errors.length > 0) {
    console.log(`form is invalid... `, v$.value.$model)
    isAddingRole.value = false
    return
  }
  const contract = await createContract(member)
  const signature = await signContract(contract)
  console.log(`member.roles: `, member.roles)
  console.log(`signature: `, signature)
  console.log(`contract: `, JSON.stringify(contract))
  memberRolesData.value = {
    member,
    signature,
    contract: JSON.stringify(contract)
  }
  console.log(`memberRolesData: `, memberRolesData.value)
  await executeCreateMemberRoles()
  isAddingRole.value = false
}

onMounted(() => {
  console.log(`team: `, team)
})
</script>
