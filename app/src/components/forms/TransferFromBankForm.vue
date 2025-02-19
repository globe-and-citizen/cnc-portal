<template>
  <h1 class="font-bold text-2xl">Transfer from {{ service }} Contract</h1>
  <h3 class="pt-8">
    This will transfer {{ amount }} {{ tokenList[selectedTokenId].symbol }} from the team
    {{ service.toLowerCase() }} contract to this address {{ to }}.
  </h3>
  <h3 class="pt-4">
    Current team {{ service.toLowerCase() }} contract's balance {{ getSelectedTokenBalance }}
    {{ tokenList[selectedTokenId].symbol }}
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

  <div class="input input-bordered flex items-center gap-2 input-md mt-2">
    <p>Amount</p>
    |
    <input type="text" class="grow" data-test="amount-input" v-model="amount" />
    |
    <div>
      <div
        role="button"
        class="flex items-center cursor-pointer gap-4 badge badge-lg badge-info"
        @click="
          () => {
            isDropdownOpen = !isDropdownOpen
          }
        "
      >
        <span>{{ tokenList[selectedTokenId].name }}</span>
        <ChevronDownIcon class="w-4 h-4" />
      </div>
      <ul
        class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] w-52 p-2 shadow"
        ref="target"
        data-test="token-dropdown"
        v-if="isDropdownOpen"
      >
        <li
          v-for="(token, id) in tokenList"
          :key="id"
          @click="
            () => {
              selectedTokenId = id
              isDropdownOpen = false
            }
          "
        >
          <a>{{ token.name }}</a>
        </li>
      </ul>
    </div>
  </div>
  <div
    class="pl-4 text-red-500 text-sm w-full text-left"
    v-for="error of $v.amount.$errors"
    :key="error.$uid"
  >
    {{ error.$message }}
  </div>

  <div class="modal-action justify-center">
    <ButtonUI
      variant="primary"
      @click="submitForm"
      :loading="loading"
      :disabled="loading"
      data-test="transferButton"
    >
      Transfer
    </ButtonUI>
    <ButtonUI variant="error" outline @click="$emit('closeModal')">Cancel</ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { NETWORK } from '@/constant'
import type { User } from '@/types'
import { ref, watch, computed } from 'vue'
import { isAddress } from 'viem'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'

const amount = ref<string>('0')
const to = ref<string | null>(null)
const description = ref<string>('')
const dropdown = ref<boolean>(true)
const selectedTokenId = ref(0)
const isDropdownOpen = ref<boolean>(false)
const target = ref<HTMLElement | null>(null)

const tokenList = [
  { name: NETWORK.currencySymbol, symbol: NETWORK.currencySymbol },
  { name: 'USDC', symbol: 'USDC' }
]

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
  usdcBalance: {
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

const getSelectedTokenBalance = computed(() => {
  if (tokenList[selectedTokenId.value].symbol === 'USDC') {
    return props.usdcBalance
  }
  return props.bankBalance
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
  emit(
    'transfer',
    to.value,
    amount.value,
    description.value,
    tokenList[selectedTokenId.value].symbol
  )
}

watch(to, () => {
  if (to.value?.length ?? 0 > 0) {
    emit('searchMembers', to.value)
  }
})

// Handle clicking outside of dropdown
onClickOutside(target, () => {
  isDropdownOpen.value = false
})
</script>

<style scoped></style>
