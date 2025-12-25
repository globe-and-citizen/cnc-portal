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
        :disabled="disabled"
      />
      |
      <input
        type="text"
        class="grow"
        ref="addressInput"
        v-model="input.address"
        :data-test="`member-contracts-address-input`"
        :placeholder="`Address`"
        :disabled="disabled"
      />
    </label>
    <!-- Dropdown positioned relative to the input -->
    <div
      v-if="
        showDropdown && !disabled && (filteredMembers.length > 0 || filteredContracts.length > 0)
      "
      class="left-0 top-full mt-4 w-full outline-none focus:outline-none focus:ring-0 z-10"
      data-test="search-dropdown"
    >
      <div class="shadow bg-base-100 rounded-box">
        <!-- Members -->
        <div
          v-if="filteredMembers.length > 0"
          class="px-2 pt-3 pb-1 text-xs uppercase text-gray-500"
        >
          Team Members
        </div>
        <div
          v-if="filteredMembers.length > 0"
          class="grid grid-cols-2 gap-4 px-2 pb-3"
          data-test="user-search-results"
        >
          <div
            v-for="member in filteredMembers"
            :key="member.address"
            class="flex items-center relative group cursor-pointer"
            data-test="user-row"
            @click="selectItem(member, 'member')"
          >
            <UserComponent
              class="p-4 flex-grow rounded-lg bg-white hover:bg-base-300"
              :user="member"
              :data-test="`user-dropdown-${member.address}`"
            />
          </div>
        </div>

        <!-- Contracts -->
        <div
          v-if="filteredContracts.length > 0"
          class="px-2 pt-2 pb-1 text-xs uppercase text-gray-500"
        >
          Contracts
        </div>
        <div
          v-if="filteredContracts.length > 0"
          class="grid grid-rows-1 gap-4 px-2 pb-3"
          data-test="contract-search-results"
        >
          <div
            v-for="contract in filteredContracts"
            :key="contract.address"
            class="flex items-center relative group cursor-pointer"
            data-test="contract-row"
            @click="selectItem({ name: contract.type, address: contract.address }, 'contract')"
          >
            <ContractComponent
              class="p-4 flex-grow rounded-lg bg-white hover:bg-base-300"
              :user="{ name: contract.type, address: contract.address }"
              :data-test="`contract-dropdown-${contract.address}`"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
/**
 * @component SelectMemberContractsInput
 * @description
 * Dual-input component for searching and selecting a team member or contract address.
 * - Integrates with Pinia teamStore for live team data.
 * - Shows a dropdown with filtered team members and contracts as the user types.
 * - Emits a 'selectItem' event with the selected item and its type ('member' or 'contract').
 * - Debounced dropdown for performance.
 * - Used in forms for user-friendly member/contract selection.
 *
 * @emits selectItem - Fires when a user selects a member or contract from the dropdown.
 * @model input - Two-way bound object: { name: string, address: string }
 */

import { ref, useTemplateRef, computed } from 'vue'
import { useTeamStore } from '@/stores'
import { watchDebounced } from '@vueuse/core'
import UserComponent from '@/components/UserComponent.vue'
import ContractComponent from '@/components/ContractComponent.vue'

const props = defineProps<{ disabled?: boolean }>()

const emit = defineEmits(['selectItem'])
const input = defineModel({
  default: {
    name: '',
    address: ''
  }
})

const teamStore = useTeamStore()
// computed for showDropdown
const showDropdown = computed(() => {
  return !props.disabled && _showDropdown.value
})
const _showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const nameInput = useTemplateRef<HTMLInputElement>('nameInput')
const addressInput = useTemplateRef<HTMLInputElement>('addressInput')

const isFetching = computed(() => teamStore.currentTeamMeta.isPending)

const filteredMembers = computed(() => {
  if (!teamStore.currentTeam?.members) return []
  const nameSearch = input.value.name.toLowerCase().trim()
  const addressSearch = input.value.address.toLowerCase().trim()

  return teamStore.currentTeam.members.filter((member) => {
    const nameMatch = nameSearch ? member.name?.toLowerCase().includes(nameSearch) : true
    const addressMatch = addressSearch ? member.address.toLowerCase().includes(addressSearch) : true
    return nameMatch && addressMatch
  })
})

const filteredContracts = computed(() => {
  if (!teamStore.currentTeam?.teamContracts) return []
  const nameSearch = input.value.name.toLowerCase().trim()
  const addressSearch = input.value.address.toLowerCase().trim()

  return teamStore.currentTeam.teamContracts.filter((contract) => {
    const nameMatch = nameSearch ? contract.type.toLowerCase().includes(nameSearch) : true
    const addressMatch = addressSearch
      ? contract.address.toLowerCase().includes(addressSearch)
      : true
    return nameMatch && addressMatch
  })
})

const selecting = ref(false)

watchDebounced(
  [() => input.value.name, () => input.value.address],
  ([name, address]) => {
    if (selecting.value) {
      selecting.value = false
      return
    }

    if (props.disabled) {
      _showDropdown.value = false
      return
    }

    if (name || address) {
      _showDropdown.value = true
    } else {
      _showDropdown.value = false
    }
  },
  { debounce: 300, maxWait: 1000 }
)

const selectItem = (item: { name: string; address: string }, type: 'member' | 'contract') => {
  selecting.value = true
  input.value = item
  emit('selectItem', { ...item, type })
  _showDropdown.value = false
}
</script>
