<template>
  <h1 class="font-bold text-2xl">Transfer from {{ service }} Contract</h1>
  <h3 class="pt-8">
    This will transfer {{ amount }} {{ NETWORK.currencySymbol }} from the team
    {{ service.toLowerCase() }} contract to this address {{ to }}.
  </h3>
  <h3 class="pt-4">
    Current team {{ service.toLowerCase() }} contract's balance {{ bankBalance }}
    {{ NETWORK.currencySymbol }}
  </h3>

  <h3 v-if="asBod" class="pt-2 text-red-500">This is will create a board of direction's action</h3>

  <div class="flex flex-col items-center">
    <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
      <p>To</p>
      |
      <input type="text" class="grow" data-test="recipient-input" v-model="to" />
    </label>
    <label v-if="asBod" class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
      <p>Description</p>
      |
      <input type="text" class="grow" data-test="description-input" v-model="description" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.to.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
    <div
      v-if="dropdown"
      class="dropdown w-full"
      :class="{ 'dropdown-open': filteredMembers.length > 0 }"
    >
      <ul
        tabindex="0"
        class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-full"
      >
        <li v-for="contractor in filteredMembers" :key="contractor.id">
          <a
            @click="
              () => {
                to = contractor.address!
                dropdown = false
              }
            "
            >{{ contractor.name }} | {{ contractor.address }}</a
          >
        </li>
      </ul>
    </div>
  </div>

  <label class="input input-bordered flex items-center gap-2 input-md mt-2">
    <p>Amount</p>
    |
    <input type="text" class="grow" data-test="amount-input" v-model="amount" />
    |
    {{ NETWORK.currencySymbol }}
  </label>
  <div
    class="pl-4 text-red-500 text-sm w-full text-left"
    v-for="error of $v.amount.$errors"
    :key="error.$uid"
  >
    {{ error.$message }}
  </div>

  <div class="modal-action justify-center">
    <LoadingButton color="primary" class="w-24" v-if="loading" />
    <button class="btn btn-primary" @click="submitForm" v-if="!loading" data-test="transferButton">
      Transfer
    </button>
    <button class="btn btn-error" @click="$emit('closeModal')">Cancel</button>
  </div>
</template>

<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
import { NETWORK } from '@/constant'
import type { User } from '@/types'
import { ref, watch } from 'vue'
import { isAddress } from 'ethers'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

const amount = ref<string>('0')
const to = ref<string | null>(null)
const description = ref<string>('')
const dropdown = ref<boolean>(true)
const emit = defineEmits(['transfer', 'closeModal', 'searchMembers'])
const props = defineProps({
  loading: {
    type: Boolean,
    required: true
  },
  bankBalance: {
    type: String,
    required: false,
    default: '0'
  },
  filteredMembers: {
    type: Array<User>,
    required: true,
    default: []
  },
  service: {
    type: String,
    required: true
  },
  asBod: {
    type: Boolean,
    required: false,
    default: false
  }
})
const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})
const rules = {
  to: {
    required,
    $valid: helpers.withMessage('Invalid address', (value: string | null) => {
      return value ? isAddress(value) : false
    })
  },
  amount: {
    required,
    numeric,
    notZero
  },
  description: {
    required: helpers.withMessage('Description is required', (value: string) => {
      return props.asBod ? value.length > 0 : true
    })
  }
}

const $v = useVuelidate(rules, { to, amount, description })

const submitForm = () => {
  $v.value.$touch()
  if ($v.value.$invalid) {
    return
  }
  emit('transfer', to.value, amount.value, description.value)
}

watch(to, () => {
  if (to.value?.length ?? 0 > 0) {
    emit('searchMembers', to.value)
  }
})
</script>

<style scoped></style>
