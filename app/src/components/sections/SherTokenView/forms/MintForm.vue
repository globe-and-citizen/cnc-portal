<template>
  <div class="flex flex-col gap-4">
    <h2>Mint {{ tokenSymbol }}</h2>

    <h3>Please input the {{ address ? '' : 'address and' }}amount to mint</h3>

    <SelectMemberInput
      data-test="address-input"
      @keyup.stop="
        () => {
          searchUsers(to ?? '')
          showDropdown = true
        }
      "
    />

    <!-- <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
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
            searchUsers(to ?? '')
            showDropdown = true
          }
        "
      />
    </label> -->
    <div
      class="dropdown"
      :class="{
        'dropdown-open': !!usersData?.users && usersData?.users.length > 0 && showDropdown
      }"
      v-if="showDropdown"
    >
      <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
        <li v-for="user in usersData?.users" :key="user.address">
          <a
            data-test="found-user"
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
      data-test="error-message-to"
      v-for="error of $v.address.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
    <!-- <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
        <p>Amount</p>
        |
        <input type="number" class="grow" data-test="amount-input" v-model="amount" />
        {{ tokenSymbol }}
      </label>
      <div
        class="pl-4 text-red-500 text-sm w-full text-left"
        data-test="error-message-amount"
        v-for="error of ²$v.amount.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div> -->

    <div class="flex flex-col gap-2">
      <label class="flex items-center">
        <span class="w-full font-bold" data-test="amount-input">Amount</span>
      </label>
      <div class="relative">
        <input
          type="number"
          class="input input-bordered input-md grow w-full pr-16"
          data-test="amount-input"
          v-model="amount"
        />
        <span
          class="absolute right-4 top-1/2 transform -translate-y-1/2 text-black font-bold text-sm"
        >
          {{ tokenSymbol }}
        </span>
      </div>
      <div
        class="pl-4 text-red-500 text-sm w-full text-left"
        data-test="error-message-amount"
        v-for="error of $v.amount.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div>
    </div>

    <div class="text-center">
      <ButtonUI
        :loading="loading || $v.value?.$invalid"
        :disabled="loading"
        variant="primary"
        class="w-44 text-center"
        @click="onSubmit()"
        data-test="submit-button"
        >Mint
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore } from '@/stores'
import { log } from '@/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, numeric, required } from '@vuelidate/validators'
import { isAddress, type Address } from 'viem'
import { watch } from 'vue'
import { onMounted, ref } from 'vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'

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
  if ($v.value?.$invalid) return

  emits('submit', to.value, amount.value!.toString())
}

const $v = useVuelidate(rules, { address: to, amount })

const search = ref('')
const showDropdown = ref(false)
const url = ref('user/search')

const {
  execute: executeSearchUser,
  data: usersData,
  error: searchError
} = useCustomFetch('user/search', {
  immediate: false,
  refetch: true
})
  .get()
  .json()

const searchUsers = async (input: string) => {
  if (input !== search.value && input.length > 0) {
    search.value = input
  }

  const params = new URLSearchParams()
  params.append('name', search.value)
  params.append('address', search.value)
  url.value += '?' + params.toString()

  await executeSearchUser()
}

watch(searchError, (value) => {
  if (value) {
    log.error('Failed to search users', value)
    addErrorToast('Failed to search users')
  }
})
onMounted(() => {
  if (props.address) {
    to.value = props.address
  }
})
</script>
