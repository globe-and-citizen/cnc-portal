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
            @click="selectMember(user)"
            class="flex items-center cursor-pointer"
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

const input = ref('')
const inputSearch = ref<HTMLInputElement | null>(null)

// Small helpers and precomputed sets for clarity/perf
const lower = (a?: string) => (a ?? '').toLowerCase()
const excludeAddressSet = computed<Set<string>>(() => {
  const set = new Set<string>()
  for (const a of props.excludeAddresses ?? []) {
    const addr = lower(a)
    if (addr) set.add(addr)
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

  // Always hide already-selected users provided via excludeAddresses
  if (excludeAddressSet.value.size === 0) return list
  return list.filter((u) => {
    const addr = lower(u.address)
    return !!addr && !excludeAddressSet.value.has(addr)
  })
})

watchDebounced(
  input,
  async () => {
    await executeSearchUser()
  },
  { debounce: 500, maxWait: 5000 }
)

const selectMember = async (member: User) => {
  input.value = ''
  emit('selectMember', member)
  await executeSearchUser()
  inputSearch.value?.focus()
}
</script>
