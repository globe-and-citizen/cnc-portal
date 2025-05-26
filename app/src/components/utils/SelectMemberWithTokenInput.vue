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
      <!--<select v-model="input.token" class="bg-white grow" data-test="select-token">
        <option disabled :value="null">-- Select a token --</option>
        <option v-for="(address, symbol) of tokens" :value="address" :key="address">
          {{ symbol }}
        </option>
      </select>-->
      <SelectComponent
        v-model="input.token"
        :options="options"
        :disabled="isFetching"
        data-test="select-token-component"
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
import { computed, ref, useTemplateRef } from 'vue'
import { useFocus, watchDebounced } from '@vueuse/core'
import { NETWORK, USDC_ADDRESS, USDT_ADDRESS } from '@/constant'
import { zeroAddress } from 'viem'
import SelectComponent from '@/components/SelectComponent.vue'

const emit = defineEmits(['selectMember'])
const input = defineModel({
  default: {
    name: '',
    address: '',
    token: ''
  }
})

const showDropdown = ref(false)
const formRef = ref<HTMLElement | null>(null)
const nameInput = useTemplateRef<HTMLInputElement>('nameInput')
const addressInput = useTemplateRef<HTMLInputElement>('addressInput')
const { focused: nameInputFocus } = useFocus(nameInput)
const { focused: addressInputFocus } = useFocus(addressInput)
const tokens = ref({
  [NETWORK.currencySymbol]: zeroAddress,
  USDC: USDC_ADDRESS,
  USDT: USDT_ADDRESS
})
const options = computed(() => {
  return Object.entries(tokens.value).map(([symbol, address]) => ({
    value: address,
    label: symbol
  }))
})

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
  input.value.name = member.name
  input.value.address = member.address
  emit('selectMember', member)
  showDropdown.value = false
}
</script>
