<template>
  <h4 class="text-lg font-bold mb-4">Create Team</h4>

  <div class="mb-4" ref="formRef">
    <h5 class="text-md font-bold">Add Founders</h5>
    <div
      v-for="(input, index) in selectedFounders"
      :key="'founder-' + index"
      class="input-group mt-3"
    >
      <label class="input input-bordered flex items-center gap-2 input-md">
        <input
          type="text"
          class="w-24"
          v-model="input.name"
          @keyup.stop="searchUsers(input, 'founder')"
          :placeholder="'Founder Name ' + (index + 1)"
        />
        |
        <input
          type="text"
          class="grow"
          v-model="input.address"
          @keyup.stop="searchUsers(input, 'founder')"
          :placeholder="'Wallet Address ' + (index + 1)"
        />
        <span class="badge badge-primary">Mandatory</span>
      </label>
    </div>

    <div
      class="dropdown"
      :class="{ 'dropdown-open': !!founderUsers.length }"
      v-if="showFounderDropdown"
    >
      <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
        <li v-for="user in founderUsers" :key="user.address">
          <a @click="selectFounder({ name: user.name || '', address: user.address || '' })">
            {{ user.name }} | {{ user.address }}
          </a>
        </li>
      </ul>
    </div>

    <div class="flex justify-end pt-3">
      <PlusCircleIcon class="w-6 h-6 cursor-pointer text-green-700" @click="addFounder()" />
      <MinusCircleIcon class="w-6 h-6 cursor-pointer text-red-700" @click="removeFounder()" />
    </div>
  </div>

  <div class="mb-4" ref="formRef">
    <h5 class="text-md font-bold">Add Members</h5>
    <div
      v-for="(input, index) in selectedMembers"
      :key="'member-' + index"
      class="input-group mt-3"
    >
      <label class="input input-bordered flex items-center gap-2 input-md">
        <input
          type="text"
          class="w-24"
          v-model="input.name"
          @keyup.stop="searchUsers(input, 'member')"
          :placeholder="'Member Name ' + (index + 1)"
        />
        |
        <input
          type="text"
          class="grow"
          v-model="input.address"
          @keyup.stop="searchUsers(input, 'member')"
          :placeholder="'Wallet Address ' + (index + 1)"
        />
        <span class="badge badge-primary">Mandatory</span>
      </label>
    </div>

    <div
      class="dropdown"
      :class="{ 'dropdown-open': !!memberUsers.length }"
      v-if="showMemberDropdown"
    >
      <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
        <li v-for="user in memberUsers" :key="user.address">
          <a @click="selectMember({ name: user.name || '', address: user.address || '' })">
            {{ user.name }} | {{ user.address }}
          </a>
        </li>
      </ul>
    </div>

    <div class="flex justify-end pt-3">
      <PlusCircleIcon class="w-6 h-6 cursor-pointer text-green-700" @click="addMember()" />
      <MinusCircleIcon class="w-6 h-6 cursor-pointer text-red-700" @click="removeMember()" />
    </div>
  </div>
  <div class="flex justify-center">
    <button @click="createTeam" class="btn btn-primary" v-if="!createTeamLoading">
      Create Team
    </button>
    <LoadingButton :color="'primary min-w-24'" v-else />
  </div>
</template>

<script setup lang="ts">
import { PlusCircleIcon } from '@heroicons/vue/24/outline'
import { MinusCircleIcon } from '@heroicons/vue/24/outline'
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useToastStore } from '@/stores'
import type { Team, User } from '@/types'
import type { Address } from 'viem'
import LoadingButton from '../LoadingButton.vue'
import { useCreateTeam } from '@/composables/officer'

const props = defineProps<{
  team: Partial<Team>
}>()
const { addErrorToast, addSuccessToast } = useToastStore()

const founderUsers = ref<Partial<User>[]>([])
const memberUsers = ref<Partial<User>[]>([])
const selectedFounders = ref([{ name: '', address: '' }])
const selectedMembers = ref([{ name: '', address: '' }])
const showFounderDropdown = ref(false)
const showMemberDropdown = ref(false)

const formRef = ref<HTMLElement | null>(null)

const handleClickOutside = (event: MouseEvent) => {
  if (formRef.value && !formRef.value.contains(event.target as Node)) {
    showFounderDropdown.value = false
    showMemberDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const {
  execute: createTeamCall,
  isLoading: createTeamLoading,
  error: createTeamError,
  isSuccess: isSuccessCreateTeam
} = useCreateTeam()

watch(createTeamError, (error) => {
  if (error) {
    createTeamLoading.value = false
    addErrorToast('Failed to create team')
  }
})
watch(isSuccessCreateTeam, () => {
  createTeamLoading.value = false

  emits('getTeam')
  addSuccessToast('Team created successfully')
})
const emits = defineEmits(['getTeam'])
const createTeam = async () => {
  createTeamLoading.value = true
  const founders: Address[] = selectedFounders.value.map((founder) => founder.address as Address)
  const members: Address[] = selectedMembers.value.map((member) => member.address as Address)
  if (!props.team.officerAddress) return
  createTeamCall(props.team.officerAddress, founders, members)
}

const selectFounder = (user: { name: string; address: string }) => {
  const lowerAddress = user.address.toLowerCase()
  if (
    selectedFounders.value.some((f) => f.address.toLowerCase() === lowerAddress) ||
    selectedMembers.value.some((m) => m.address.toLowerCase() === lowerAddress)
  ) {
    addErrorToast('This address is already selected')
    return
  }
  const lastIndex = selectedFounders.value.length - 1
  selectedFounders.value[lastIndex].name = user.name
  selectedFounders.value[lastIndex].address = user.address
  showFounderDropdown.value = false
}
const selectMember = (user: { name: string; address: string }) => {
  const lowerAddress = user.address.toLowerCase()
  if (
    selectedFounders.value.some((f) => f.address.toLowerCase() === lowerAddress) ||
    selectedMembers.value.some((m) => m.address.toLowerCase() === lowerAddress)
  ) {
    addErrorToast('This address is already selected')
    return
  }
  const lastIndex = selectedMembers.value.length - 1
  selectedMembers.value[lastIndex].name = user.name
  selectedMembers.value[lastIndex].address = user.address
  showMemberDropdown.value = false
}

const addFounder = () => {
  selectedFounders.value.push({ name: '', address: '' })
}

const removeFounder = () => {
  if (selectedFounders.value.length > 1) selectedFounders.value.pop()
}

const addMember = () => {
  selectedMembers.value.push({ name: '', address: '' })
}

const removeMember = () => {
  if (selectedMembers.value.length > 1) selectedMembers.value.pop()
}

const searchUsers = async (
  input: { name?: string; address: string },
  type: 'founder' | 'member'
) => {
  try {
    const members = props.team.members
    if (members) {
      const result = {
        users: members.filter((member: { name: string; address: string }) => {
          if (input.name && input.address && member.name) {
            return (
              member.name.toLowerCase().includes(input.name.toLowerCase()) &&
              member.address.toLowerCase().includes(input.address.toLowerCase())
            )
          } else if (input.name && member.name) {
            return member.name.toLowerCase().includes(input.name.toLowerCase())
          } else if (input.address) {
            return member.address.toLowerCase().includes(input.address.toLowerCase())
          }
          return false
        })
      }
      if (type === 'founder') {
        founderUsers.value = result.users
        showFounderDropdown.value = result.users.length > 0
      } else if (type === 'member') {
        memberUsers.value = result.users
        showMemberDropdown.value = result.users.length > 0
      }
    }
  } catch (error) {
    console.error(error)
    addErrorToast('Failed to search users')
  }
}
</script>
