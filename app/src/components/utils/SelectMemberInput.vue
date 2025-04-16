<template>
  <div class="input-group relative" ref="formRef" data-test="member-input">
    <label
      class="input input-bordered flex items-center gap-2 input-md"
      :data-test="`member-input`"
    >
      <input
        type="text"
        class="w-24"
        v-model="input.name"
        :placeholder="'Member Name '"
        :data-test="`member-name-input`"
      />
      |
      <input
        type="text"
        class="grow"
        v-model="input.address"
        :data-test="`member-address-input`"
        :placeholder="`Member Address`"
      />
    </label>
    <!-- Dropdown positioned relative to the input -->
    <div
      v-if="showDropdown && users?.users && users?.users.length > 0"
      class="absolute left-0 top-full mt-1 w-full z-10"
      data-test="user-dropdown"
    >
      <ul class="p-2 shadow menu dropdown-content bg-base-100 rounded-box w-full">
        <li v-for="user in users.users" :key="user.address">
          <a
            :data-test="`user-dropdown-${user.address}`"
            @click="
              () => {
                selectMember(user)
                showDropdown = false
              }
            "
          >
            {{ user.name }} | {{ user.address }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useCustomFetch } from '@/composables/useCustomFetch'
import { ref } from 'vue'
import { debouncedWatch } from '@vueuse/core'

const emit = defineEmits(['selectMember'])
const input = defineModel({
  default: {
    name: '',
    address: ''
  }
})

const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const url = ref('user/search')
const { execute: executeSearchUser, data: users } = useCustomFetch(url, { immediate: false })
  .get()
  .json()

const searchUsers = async (input: { name: string; address: string }) => {
  if (input.address == '' && input.name) {
    url.value = 'user/search?name=' + input.name
  } else if (input.name == '' && input.address) {
    url.value = 'user/search?address=' + input.address
  }
  await executeSearchUser()
  showDropdown.value = true
}

debouncedWatch(
  [() => input.value.name, () => input.value.address],
  ([name, address]) => {
    if (name || address) {
      searchUsers({ name, address })
    }
  },
  { debounce: 300, maxWait: 600 }
)

const selectMember = (member: { name: string; address: string }) => {
  input.value = member
  emit('selectMember', member)
}
</script>
