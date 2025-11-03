<template>
  <div
    class="input-group relative"
    :class="isFetching ? 'animate-pulse' : ''"
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
        v-model="input"
        ref="inputSearch"
        placeholder="Member Name or Member Address"
        :data-test="`member-input`"
        :disabled="disabled"
      />
      <!-- |

      @focus="handleFocus"
      <input
        type="text"
        class="grow"
        ref="addressInput"
        v-model="input.address"
        :data-test="`member-address-input`"
        :placeholder="`Member Address`"
        :disabled="disabled"
      /> -->
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
            v-for="user in filteredUsers"
            :key="user.address"
            @click="selectMember(user)"
            class="flex items-center cursor-pointer"
          >
            <UserComponent
              class="bg-white p-4 flex-grow rounded-lg hover:bg-base-200"
              :user="user"
              :data-test="`user-dropdown-${user.address}`"
            />
          </div>
        </div>
        <!-- <li v-for="user in users.users" :key="user.address">
          <a :data-test="`user-dropdown-${user.address}`" @click="selectMember(user)">
            {{ user.name }} | {{ user.address }}
          </a>
        </li> -->
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useCustomFetch } from '@/composables/useCustomFetch'
import { ref, computed } from 'vue'
import { watchDebounced } from '@vueuse/core'
import UserComponent from '@/components/UserComponent.vue'

interface Props {
  disabled?: boolean
  initialLimit?: number
  excludeAddresses?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  excludeAddresses: () => []
})

type User = { name: string; address: string }

const emit = defineEmits<{
  selectMember: [member: User]
}>()

const input = ref('')

const formRef = ref<HTMLElement | null>(null)
const inputSearch = ref<HTMLInputElement | null>(null)

// Build URL reactively from the single input; backend will search name OR address
const url = computed(() => {
  const query = input.value
  if (!query) return `user?limit=8`
  return `user?search=${query}&limit=8`
})

const {
  execute: executeSearchUser,
  data: users,
  isFetching
} = useCustomFetch(url, { immediate: true }).get().json()

const getCurrentUsers = (): User[] => {
  const val: unknown = users.value
  if (val && typeof val === 'object') {
    const arr = (val as { users?: unknown }).users
    if (Array.isArray(arr)) return arr as User[]
  }
  return []
}

const filteredUsers = computed<User[]>(() => {
  const list = getCurrentUsers()
  if (!props.excludeAddresses || props.excludeAddresses.length === 0) return list
  const exclude = new Set(props.excludeAddresses.map((a) => a.toLowerCase()))
  return list.filter((u) => !exclude.has(u.address.toLowerCase()))
})

// Debounce user input to avoid excessive requests
watchDebounced(
  input,
  async () => {
    await executeSearchUser()
  },
  { debounce: 500, maxWait: 5000 }
)

const selectMember = async (member: User) => {
  // Show the selected member name in the input and emit selection
  input.value = ''
  emit('selectMember', member)
  await executeSearchUser()
  inputSearch.value?.focus()
}

// Auto-open on mount if requested
</script>
