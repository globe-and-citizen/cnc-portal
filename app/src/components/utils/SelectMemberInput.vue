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
        v-model="input.name"
        ref="nameInput"
        :placeholder="'Select Member '"
        :data-test="`member-name-input`"
        @focus="handleFocus"
        :disabled="disabled"
      />
      <!-- |
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
import { ref, useTemplateRef, onMounted, computed } from 'vue'
import { useFocus, watchDebounced } from '@vueuse/core'
import UserComponent from '@/components/UserComponent.vue'

interface Props {
  disabled?: boolean
  autoOpen?: boolean
  initialLimit?: number
  excludeAddresses?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  autoOpen: true,
  initialLimit: 8,
  excludeAddresses: () => []
})

const emit = defineEmits(['selectMember'])

const input = defineModel({
  default: {
    name: '',
    address: ''
  }
})

const formRef = ref<HTMLElement | null>(null)
const nameInput = useTemplateRef<HTMLInputElement>('nameInput')
const addressInput = useTemplateRef<HTMLInputElement>('addressInput')
const { focused: nameInputFocus } = useFocus(nameInput)
const { focused: addressInputFocus } = useFocus(addressInput)

const url = ref('user/search')
const {
  execute: executeSearchUser,
  data: users,
  isFetching
} = useCustomFetch(url, { immediate: false }).get().json()

// Helper to preload a default, paginated list of users
const preloadUsers = async () => {
  if (props.disabled) return
  url.value = `user?limit=${props.initialLimit}&page=1`
  await executeSearchUser()
}

type User = { name: string; address: string }
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

// Open and preload when the field receives focus and no query is present yet
const handleFocus = async () => {
  if (props.disabled) return
  // If we don't have any list yet, fetch a default page
  if (getCurrentUsers().length === 0) {
    await preloadUsers()
  }
}

watchDebounced(
  () => [input.value.name, input.value.address],
  async ([name, address]) => {
    if (nameInputFocus.value && name) {
      url.value = 'user/search?name=' + name
      await executeSearchUser()
    } else if (addressInputFocus.value && address) {
      url.value = 'user/search?address=' + address
      await executeSearchUser()
    }
  },
  { debounce: 500, maxWait: 5000 }
)

const selectMember = (member: { name: string; address: string }) => {
  input.value = member
  emit('selectMember', member)
}

// Auto-open on mount if requested
onMounted(async () => {
  if (props.autoOpen && !props.disabled) {
    await preloadUsers()
  }
})
</script>
