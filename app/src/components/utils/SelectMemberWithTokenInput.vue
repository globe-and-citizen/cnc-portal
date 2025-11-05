<template>
  <div
    class="input-group relative"
    :class="teamStore.currentTeamMeta.teamIsFetching ? 'animate-pulse' : ''"
    ref="formRef"
    data-test="member-input"
  >
    <label
      class="input input-bordered flex items-center gap-2 input-md"
      :data-test="`member-input`"
    >
      <input
        type="text"
        class="w-24"
        v-model="input.name"
        ref="nameInput"
        :placeholder="'Member Name '"
        :data-test="`member-name-input`"
      />
      |
      <input
        type="text"
        class="grow"
        ref="addressInput"
        v-model="input.address"
        :data-test="`member-address-input`"
        :placeholder="`Member Address`"
      />
      |
      <SelectComponent
        v-if="filteredMembers.length > 0"
        v-model="input.token"
        :options="options"
        :disabled="teamStore.currentTeamMeta.teamIsFetching"
        :format-value="
          (value: string) => {
            return value === `SepoliaETH` ? `SepETH` : value
          }
        "
      />
    </label>
    <!-- Dropdown positioned relative to the input -->
    <div
      v-if="showDropdown && filteredMembers && filteredMembers.length > 0"
      class="left-0 top-full mt-4 w-full border rounded-xl p-4"
      data-test="user-dropdown"
    >
      <p class="pb-3 font-bold">Click to select Member</p>
      <div class="bg-base-100 rounded-box">
        <div class="grid grid-cols-2 gap-4" data-test="user-search-results">
          <div
            v-for="user in filteredMembers.slice(0, 8)"
            :key="user.address"
            @click="selectMember(user)"
            class="flex items-center cursor-pointer"
            data-test="user-row"
          >
            <UserComponent
              class="bg-base-200 p-4 flex-grow rounded-lg hover:bg-base-300"
              :user="user"
              :data-test="`user-dropdown-${user.address}`"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { zeroAddress } from 'viem'
import SelectComponent from '@/components/SelectComponent.vue'
import { useTeamStore } from '@/stores'
import { useFocus, watchDebounced } from '@vueuse/core'
import UserComponent from '../UserComponent.vue'

const emit = defineEmits(['selectMember'])
const input = defineModel({
  default: {
    name: '',
    address: '',
    token: ''
  }
})
const teamStore = useTeamStore()
const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const nameInput = useTemplateRef<HTMLInputElement>('nameInput')
const addressInput = useTemplateRef<HTMLInputElement>('addressInput')
const { focused: nameInputFocus } = useFocus(nameInput)
const { focused: addressInputFocus } = useFocus(addressInput)
const tokens = ref({
  USDC: USDC_ADDRESS,
  [NETWORK.currencySymbol]: zeroAddress
})
const options = computed(() => {
  return Object.entries(tokens.value).map(([symbol, address]) => ({
    value: address,
    label: symbol
  }))
})

const filteredMembers = computed(() => {
  if (!teamStore.currentTeam?.members) return []

  const nameQuery = input.value.name.toLowerCase()
  const addressQuery = input.value.address.toLowerCase()

  // If both inputs are empty, return all members
  if (!nameQuery && !addressQuery) {
    return teamStore.currentTeam.members
  }

  return teamStore.currentTeam.members.filter((member) => {
    const memberName = member.name.toLowerCase()
    const memberAddress = member.address.toLowerCase()

    // Search by name if name input has value
    if (nameQuery) {
      return memberName.includes(nameQuery)
    }

    // Search by address if address input has value
    if (addressQuery) {
      return memberAddress.includes(addressQuery)
    }

    return false
  })
})

watchDebounced(
  () => [input.value.name, input.value.address, nameInputFocus.value, addressInputFocus.value],
  async () => {
    if (nameInputFocus.value || addressInputFocus.value) {
      showDropdown.value = true
    } else {
      showDropdown.value = false
    }
  },
  { debounce: 500, maxWait: 5000 }
)

const selectMember = (member: { name: string; address: string }) => {
  input.value.name = member.name
  input.value.address = member.address
  emit('selectMember', member)
  showDropdown.value = false
}
</script>
