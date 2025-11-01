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
    <!-- Dropdown positioned relative to the input 
      v-if="showDropdown && users?.users && users?.users.length > 0"
      -->
    <div
      class="left-0 top-full mt-5 w-full outline-none focus:outline-none focus:ring-0"
      data-test="user-dropdown"
    >
      <div class="shadow bg-base-100 rounded-box">
        <div class="grid grid-cols-2 gap-4" data-test="user-search-results">
          <div
            v-for="user in users.users"
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
import { ref, useTemplateRef, onMounted } from 'vue'
import { useFocus, watchDebounced } from '@vueuse/core'
import UserComponent from '@/components/UserComponent.vue'

interface Props {
  disabled?: boolean
  autoOpen?: boolean
  initialLimit?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoOpen: true,
  initialLimit: 8
})

const emit = defineEmits(['selectMember'])

const input = defineModel({
  default: {
    name: '',
    address: ''
  }
})

const showDropdown = ref(false)
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
  showDropdown.value = true
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

// Open and preload when the field receives focus and no query is present yet
const handleFocus = async () => {
  if (props.disabled) return
  // If we don't have any list yet, fetch a default page
  if (getCurrentUsers().length === 0) {
    await preloadUsers()
  } else {
    showDropdown.value = true
  }
}

watchDebounced(
  () => [input.value.name, input.value.address],
  async ([name, address]) => {
    if (nameInputFocus.value && name) {
      url.value = 'user/search?name=' + name
      await executeSearchUser()
      showDropdown.value = true
    } else if (addressInputFocus.value && address) {
      url.value = 'user/search?address=' + address
      await executeSearchUser()
      showDropdown.value = true
    }
  },
  { debounce: 500, maxWait: 5000 }
)

const selectMember = (member: { name: string; address: string }) => {
  input.value = member
  emit('selectMember', member)
  showDropdown.value = false
}

// Auto-open on mount if requested
onMounted(async () => {
  if (props.autoOpen && !props.disabled) {
    await preloadUsers()
  }
})
</script>
