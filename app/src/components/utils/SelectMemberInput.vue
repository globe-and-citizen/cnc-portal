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
        class="w-24"
        v-model="input"
        ref="inputSearch"
        placeholder="Member Name or Member Address"
        :data-test="`member-input`"
        :disabled="disabled"
      />
    </label>
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
            @click="!inTeam(user) && selectMember(user)"
            class="flex items-center"
            :class="
              inTeam(user) ? 'cursor-not-allowed opacity-60 hover:opacity-80' : 'cursor-pointer'
            "
            :aria-disabled="inTeam(user) ? 'true' : 'false'"
            :title="inTeam(user) ? 'Already in the team' : ''"
            data-test="user-row"
          >
            <UserComponent
              class="bg-white p-4 flex-grow rounded-lg hover:bg-base-300"
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
import { useCustomFetch } from '@/composables/useCustomFetch'
import { ref, computed } from 'vue'
import { watchDebounced } from '@vueuse/core'
import UserComponent from '@/components/UserComponent.vue'
import type { User } from '@/types'
import { useTeamStore } from '@/stores'

interface Props {
  disabled?: boolean
  excludeAddresses?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  excludeAddresses: () => []
})

// type User = { name: string; address: string }

const emit = defineEmits<{
  selectMember: [member: User]
}>()

// v-model support for selected member
const model = defineModel<Pick<User, 'name' | 'address'>>({
  default: { name: '', address: '' }
})

const input = ref('')
const teamStore = useTeamStore()

const inputSearch = ref<HTMLInputElement | null>(null)

// Small helpers and precomputed sets for clarity/perf
const lower = (a?: string) => (a ?? '').toLowerCase()
const teamAddressSet = computed<Set<string>>(() => {
  const set = new Set<string>()
  for (const m of teamStore.currentTeam?.members ?? []) {
    const addr = lower((m as Partial<User>).address)
    if (addr) set.add(addr)
  }
  return set
})
const excludeAddressSet = computed<Set<string>>(() => {
  const set = new Set<string>()
  for (const a of props.excludeAddresses ?? []) {
    const addr = lower(a)
    if (addr) set.add(addr)
  }
  return set
})
const selectedOnlySet = computed<Set<string>>(() => {
  const set = new Set<string>()
  for (const addr of excludeAddressSet.value) {
    if (addr && !teamAddressSet.value.has(addr)) set.add(addr)
  }
  return set
})

// Build URL reactively from the single input; backend will search name OR address
const url = computed(() => {
  const query = input.value
  if (!query) return `user?limit=16`
  return `user?search=${query}&limit=16`
})

const {
  execute: executeSearchUser,
  data: users,
  isFetching
} = useCustomFetch(url, { immediate: true }).get().json<User[] | { users: User[] }>()

const filteredUsers = computed<User[]>(() => {
  const val: unknown = users.value
  let list: User[] = []

  if (Array.isArray(val)) {
    list = val as User[]
  } else if (val && typeof val === 'object') {
    const rec = val as Record<string, unknown>
    const maybeUsers = rec.users
    if (Array.isArray(maybeUsers)) {
      list = maybeUsers as User[]
    }
  }

  const hasQuery = input.value.length > 0

  // No search: hide everything in excludeAddresses (team members and already selected)
  if (!hasQuery) {
    if (excludeAddressSet.value.size === 0) return list
    return list.filter((u) => {
      const addr = lower(u.address)
      return addr !== '' && !excludeAddressSet.value.has(addr)
    })
  }

  // Searching: include team members, but still hide already selected (non-team) users
  return list.filter((u) => {
    const addr = lower(u.address)
    if (!addr) return false
    if (selectedOnlySet.value.has(addr)) return false
    return true
  })
})

// Helper: check if a user already belongs to the current team
const inTeam = (user: User) => teamAddressSet.value.has(lower(user?.address))

watchDebounced(
  input,
  async () => {
    await executeSearchUser()
  },
  { debounce: 500, maxWait: 5000 }
)

const selectMember = async (member: User) => {
  // Show the selected member name in the input and emit selection
  const addr = lower(member?.address)
  if (teamAddressSet.value.has(addr)) return

  input.value = ''
  // update v-model for parent consumers
  model.value = { name: member.name, address: member.address }
  emit('selectMember', member)
  await executeSearchUser()
  inputSearch.value?.focus()
}

// Auto-open on mount if requested
</script>
