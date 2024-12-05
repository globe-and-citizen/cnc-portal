<template>
  <div class="flex flex-col gap-4">
    <h2>Mint {{ tokenSymbol }}</h2>

    <h3>Please input the {{ address ? '' : 'address and' }}amount to mint</h3>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
      <p>Address</p>
      |
      <input
        type="text"
        class="grow"
        data-test="address-input"
        v-model="to"
        :disabled="Boolean(address)"
        @keyup.stop="
          () => {
            searchUsers({ name: to ?? '' })
            showDropdown = true
          }
        "
      />
    </label>
    <div
      class="dropdown"
      :class="{ 'dropdown-open': !!foundUsers && foundUsers.length > 0 && showDropdown }"
      v-if="showDropdown"
    >
      <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
        <li v-for="user in foundUsers" :key="user.address">
          <a
            @click="
              () => {
                to = user.address ?? ''
                showDropdown = false
              }
            "
          >
            {{ user.name }} | {{ user.address }}
          </a>
        </li>
      </ul>
    </div>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.address.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
      <p>Amount</p>
      |
      <input type="number" class="grow" data-test="amount-input" v-model="amount" />
      {{ tokenSymbol }}
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.amount.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <div class="text-center">
      <ButtonUI :loading="loading" :disabled="loading" class="btn btn-primary w-44 text-center" @click="onSubmit()">
        Mint
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'
import type { User } from '@/types'
import useVuelidate from '@vuelidate/core'
import { helpers, numeric, required } from '@vuelidate/validators'
import { isAddress, type Address } from 'viem'
import { watch } from 'vue'
import { onMounted, ref } from 'vue'

const { addErrorToast } = useToastStore()
const to = ref<string | null>(null)
const amount = ref<number | null>(null)

const props = defineProps<{
  address?: Address
  tokenSymbol: string | undefined
  loading: boolean
}>()
const emits = defineEmits(['submit'])

const rules = {
  address: {
    required,
    isAddress: helpers.withMessage('Invalid address', isAddress)
  },
  amount: {
    required,
    numeric,
    minValue: helpers.withMessage('Amount must be greater than 0', (value: number) => value > 0)
  }
}

const onSubmit = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return

  emits('submit', to.value, amount.value!.toString())
}

const $v = useVuelidate(rules, { address: to, amount })

const searchUserName = ref('')
const foundUsers = ref<User[]>([])
const showDropdown = ref(false)

const {
  execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch('user/search', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    const params = new URLSearchParams()
    params.append('name', searchUserName.value)

    url += '?' + params.toString()
    return { options, url, cancel }
  }
})
  .get()
  .json()

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})
const searchUsers = async (input: { name: string }) => {
  try {
    if (input.name !== searchUserName.value && input.name.length > 0) {
      searchUserName.value = input.name
    }
    await executeSearchUser()
  } catch (error: unknown) {
    if (error instanceof Error) {
      addErrorToast(error.message)
    } else {
      addErrorToast('An unknown error occurred')
    }
  }
}

onMounted(() => {
  if (props.address) {
    to.value = props.address
  }
})
</script>
