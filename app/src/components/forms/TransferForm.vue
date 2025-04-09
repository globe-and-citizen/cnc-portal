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
          <IconifyIcon icon="heroicons-outline:chevron-down" class="w-4 h-4" />
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

    <div v-if="model.amount && parseFloat(model.amount) > 0" class="text-sm text-gray-500">
      ≈ {{ formattedTransferAmount }}
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
import { Icon as IconifyIcon } from '@iconify/vue'
import { onClickOutside } from '@vueuse/core'
import SelectMemberInput from '../utils/SelectMemberInput.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import { NETWORK } from '@/constant'
import { useCryptoPrice } from '@/composables/useCryptoPrice'

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
const currencyStore = useCurrencyStore()

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
const { price: usdcPrice } = useCryptoPrice('usd-coin')

// New computed property for transfer amount in default currency
const formattedTransferAmount = computed(() => {
  const amount = parseFloat(model.value.amount)
  if (isNaN(amount) || amount <= 0) return '0.00'

  if (model.value.token.symbol === NETWORK.currencySymbol) {
    return Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.currency.code,
      minimumFractionDigits: 2
    }).format(amount * (currencyStore.nativeTokenPrice || 0))
  }
  // If the selected token is USDC (stablecoin)
  else if (model.value.token.symbol === 'USDC') {
    // USDC is pegged to USD, so just use the currency store's rate
    return Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.currency.code,
      minimumFractionDigits: 2
    }).format(amount * (usdcPrice.value || 0))
  }

  // Default case
  return amount.toFixed(2)
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
