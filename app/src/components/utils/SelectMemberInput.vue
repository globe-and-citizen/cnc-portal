<template>
  <div
    class="input-group relative"
    :class="isFetching ? 'animate-pulse' : ''"
    data-test="member-input"
  >
    <label
      class="input input-bordered flex items-center gap-2 input-md"
      :data-test="`member-input`"
    >
      <input
        type="text"
        class="w-full"
        v-model="input"
        ref="inputSearch"
        placeholder="Member Name or Member Address"
        :data-test="`member-input`"
        :disabled="disabled"
      />
    </label>
    <div v-if="!showOnFocus || (showOnFocus && showDropdown)">
      <div class="text-xm text-gray-900 mt-5" data-test="select-member-hint">
        Click to Select a Member
      </div>
      <!-- Dropdown positioned relative to the input -->
      <div
        v-if="filteredUsers.length > 0"
        class="left-0 top-full mt-4 w-full outline-none focus:outline-none focus:ring-0"
        data-test="user-dropdown"
      >
        <div class="shadow bg-base-100 rounded-box">
          <div class="grid grid-cols-2 gap-4" data-test="user-search-results">
            <div
              v-for="user in filteredUsers.slice(0, 8)"
              :key="user.address"
              @click="handleSelectMember(user)"
              class="flex items-center relative group"
              :class="
                disableTeamMembers && isTeamMember(user) ? 'cursor-not-allowed' : 'cursor-pointer'
              "
              data-test="user-row"
            >
              <UserComponent
                class="p-4 flex-grow rounded-lg"
                :class="
                  disableTeamMembers && isTeamMember(user)
                    ? 'bg-gray-200 opacity-60'
                    : 'bg-white hover:bg-base-300'
                "
                :user="user"
                :data-test="`user-dropdown-${user.address}`"
              />
              <!-- Tooltip for users already in team -->
              <div
                v-if="disableTeamMembers && isTeamMember(user)"
                class="absolute hidden group-hover:block bg-gray-800 text-white text-sm rounded px-2 py-1 -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-10"
              >
                Already in your team
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useSearchUsersQuery } from '@/queries/user.queries'
import { ref, computed, watch } from 'vue'
import { useFocus, watchDebounced } from '@vueuse/core'
import UserComponent from '@/components/UserComponent.vue'
import type { User } from '@/types'
import { useTeamStore } from '@/stores/teamStore'

interface Props {
  disabled?: boolean
  showOnFocus?: boolean
  onlyTeamMembers?: boolean
  hiddenMembers: User[]
  disableTeamMembers: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showOnFocus: false,
  onlyTeamMembers: false,
  hiddenMembers: () => [],
  disableTeamMembers: false
})

const teamStore = useTeamStore()

// type User = { name: string; address: string }

const emit = defineEmits<{
  selectMember: [member: User]
}>()

const input = ref('')
const inputSearch = ref<HTMLInputElement | null>(null)
const { focused: searchInputFocus } = useFocus(inputSearch)
const showDropdown = ref(false)

// Small helpers and precomputed sets for clarity/perf
const lower = (a?: string) => (a ?? '').toLowerCase()

// Debounced search value for the query
const debouncedSearch = ref('')

// Use TanStack Query for user search
const { data: usersData, isFetching, refetch } = useSearchUsersQuery(debouncedSearch, 100)

const isTeamMember = (user: User): boolean => {
  const members: User[] = teamStore.currentTeam?.members ?? []
  return members.some((member) => lower(member.address) === lower(user.address))
}

const filteredUsers = computed<User[]>(() => {
  let members: User[] = []
  if (props.onlyTeamMembers) {
    // get an empty array or the current team members
    members = teamStore.currentTeam?.members ?? []
  } else {
    members = usersData.value ? (usersData.value.users as User[]) : []
  }

  // filter this members and remove hidden Members
  return members.filter(
    (user) => !props.hiddenMembers.some((hiddenMember) => hiddenMember.address === user.address)
  )
  // users.value
})

watchDebounced(
  input,
  async (newValue) => {
    if (!props.onlyTeamMembers) {
      debouncedSearch.value = newValue
    }
  },
  { debounce: 500, maxWait: 5000 }
)

watch(searchInputFocus, (newVal) => {
  if (props.showOnFocus && newVal) {
    showDropdown.value = true
  }
})

const handleSelectMember = async (member: User) => {
  if (props.disableTeamMembers && isTeamMember(member)) {
    return
  }
  showDropdown.value = false
  input.value = ''
  emit('selectMember', member)
  debouncedSearch.value = ''
  await refetch()
  inputSearch.value?.focus()
}
</script>
