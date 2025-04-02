<template>
  <h1 class="font-bold text-2xl">Transfer from {{ service }} Contract</h1>
  <h3 class="pt-4">
    Current contract balance: {{ getSelectedTokenBalance }} {{ model.token.symbol }}
  </h3>

  <div class="flex flex-col gap-4 mt-4">
    <SelectMemberInput v-model="model.address" />

    <div class="input input-bordered flex items-center gap-2 input-md">
      <p>Amount</p>
      |
      <input type="text" class="grow" data-test="amount-input" v-model="model.amount" />
      |
      <div>
        <div
          role="button"
          class="flex items-center cursor-pointer gap-4 badge badge-lg badge-info"
          @click="() => (isDropdownOpen = !isDropdownOpen)"
        >
          <span>{{ model.token.symbol }}</span>
          <ChevronDownIcon class="w-4 h-4" />
        </div>
        <ul
          class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] w-52 p-2 shadow"
          ref="target"
          data-test="token-dropdown"
          v-if="isDropdownOpen"
        >
          <li
            v-for="token in tokens"
            :key="token.symbol"
            @click="
              () => {
                model.token = token
                isDropdownOpen = false
              }
            "
          >
            <a>{{ token.symbol }}</a>
          </li>
        </ul>
      </div>
    </div>

    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.model.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
  </div>

  <div class="modal-action justify-center mt-4">
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
import { ref, computed, onMounted } from 'vue'
import { isAddress } from 'viem'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'
import SelectMemberInput from '../utils/SelectMemberInput.vue'

interface Token {
  symbol: string
  balance: string
}

interface TransferModel {
  address: {
    name: string
    address: string
  }
  token: Token
  amount: string
}

const props = defineProps<{
  loading: boolean
  tokens: Token[]
  service: string
}>()

const emit = defineEmits(['transfer', 'closeModal'])

const model = defineModel<TransferModel>({
  required: true,
  default: () => ({
    address: { name: '', address: '' },
    token: { symbol: '', balance: '0' },
    amount: '0'
  })
})

const isDropdownOpen = ref(false)
const target = ref<HTMLElement | null>(null)

const getSelectedTokenBalance = computed(() => {
  return model.value.token.balance
})

const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})

const rules = {
  model: {
    address: {
      required,
      $valid: helpers.withMessage('Invalid address', (value: { address: string }) => {
        return value.address ? isAddress(value.address) : false
      })
    },
    amount: {
      required,
      numeric,
      notZero
    },
    token: {
      required
    }
  }
}

const $v = useVuelidate(rules, { model })

const submitForm = () => {
  $v.value.$touch()
  if ($v.value.$invalid) {
    return
  }
  emit('transfer', model.value)
}

// Handle clicking outside of dropdown
onClickOutside(target, () => {
  isDropdownOpen.value = false
})

onMounted(() => {
  if (props.tokens.length > 0) {
    model.value.token = props.tokens[0]
  }
})
</script>
