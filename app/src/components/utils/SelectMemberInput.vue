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
        :placeholder="'Member Name '"
        :data-test="`member-name-input`"
        :disabled="disabled"
      />
      |
      <input
        type="text"
        class="grow"
        ref="addressInput"
        v-model="input.address"
        :data-test="`member-address-input`"
        :placeholder="`Member Address`"
        :disabled="disabled"
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
          <a :data-test="`user-dropdown-${user.address}`" @click="selectMember(user)">
            {{ user.name }} | {{ user.address }}
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useCustomFetch } from '@/composables/useCustomFetch'
import { ref, useTemplateRef } from 'vue'
import { useFocus, watchDebounced } from '@vueuse/core'

defineProps<{ disabled?: boolean }>()
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
</script>
