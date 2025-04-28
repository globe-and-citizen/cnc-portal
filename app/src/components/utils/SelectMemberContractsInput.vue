<template>
  <div
    class="input-group relative"
    :class="isFetching ? 'animate-pulse' : ''"
    ref="formRef"
    data-test="member-contracts-input"
  >
    <label
      class="input input-bordered flex items-center gap-2 input-md"
      :data-test="`member-contracts-input`"
    >
      <input
        type="text"
        class="w-24"
        v-model="input.name"
        ref="nameInput"
        :placeholder="'Name'"
        :data-test="`member-contracts-name-input`"
      />
      |
      <input
        type="text"
        class="grow"
        ref="addressInput"
        v-model="input.address"
        :data-test="`member-contracts-address-input`"
        :placeholder="`Address`"
      />
    </label>
    <!-- Dropdown positioned relative to the input -->
    <div
      v-if="showDropdown && (filteredMembers.length > 0 || filteredContracts.length > 0)"
      class="absolute left-0 top-full mt-1 w-full z-10"
      data-test="search-dropdown"
    >
      <ul class="p-2 shadow menu dropdown-content bg-base-100 rounded-box w-full">
        <!-- Members Section -->
        <li v-if="filteredMembers.length > 0" class="menu-title">
          <span>Team Members</span>
        </li>
        <li v-for="member in filteredMembers" :key="member.address">
          <a :data-test="`user-dropdown-${member.address}`" @click="selectItem(member, 'member')">
            {{ member.name }} | {{ member.address }}
          </a>
        </li>
        <!-- Contracts Section -->
        <li v-if="filteredContracts.length > 0" class="menu-title">
          <span>Contracts</span>
        </li>
        <li v-for="contract in filteredContracts" :key="contract.address">
          <a
            :data-test="`contract-dropdown-${contract.address}`"
            @click="selectItem({ name: contract.type, address: contract.address }, 'contract')"
          >
            {{ contract.type }} | {{ contract.address }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef, computed, watch } from 'vue'
import { useTeamStore } from '@/stores'

const emit = defineEmits(['selectItem'])
const input = defineModel({
  default: {
    name: '',
    address: ''
  }
})

const teamStore = useTeamStore()
const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const nameInput = useTemplateRef<HTMLInputElement>('nameInput')
const addressInput = useTemplateRef<HTMLInputElement>('addressInput')

const isFetching = computed(() => teamStore.currentTeamMeta.teamIsFetching)

// Filter members and contracts based on input
const filteredMembers = computed(() => {
  if (!teamStore.currentTeam?.members) return []
  const searchTerm = input.value.name.toLowerCase()
  return teamStore.currentTeam.members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm) ||
      member.address.toLowerCase().includes(input.value.address.toLowerCase())
  )
})

const filteredContracts = computed(() => {
  if (!teamStore.currentTeam?.teamContracts) return []
  const searchTerm = input.value.name.toLowerCase()
  return teamStore.currentTeam.teamContracts.filter(
    (contract) =>
      contract.type.toLowerCase().includes(searchTerm) ||
      contract.address.toLowerCase().includes(input.value.address.toLowerCase())
  )
})

watch([() => input.value.name, () => input.value.address], () => {
  if (input.value.name || input.value.address) {
    showDropdown.value = true
  } else {
    showDropdown.value = false
  }
})

const selectItem = (item: { name: string; address: string }, type: 'member' | 'contract') => {
  input.value = item
  emit('selectItem', { ...item, type })
  showDropdown.value = false
}
</script>
