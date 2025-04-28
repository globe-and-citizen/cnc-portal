<template>
  <h1 class="font-bold text-2xl">Transfer from {{ service }} Contract</h1>
  <h3 class="pt-4">
    Current contract balance: {{ getSelectedTokenBalance }} {{ model.token.symbol }}
  </h3>

  <div class="flex flex-col gap-4 mt-4">
    <SelectMemberContractsInput v-model="model.address" @selectItem="handleSelectItem" />

    <div class="input input-bordered flex items-center gap-2 input-md">
      <div class="grow flex items-center gap-2">
        <input
          type="text"
          class="grow"
          data-test="amount-input"
          v-model="model.amount"
          @input="handleAmountInput"
        />
        <div class="flex gap-1" data-test="percentage-buttons">
          <button
            v-for="percent in [25, 50, 75]"
            :key="percent"
            class="btn btn-xs btn-ghost cursor-pointer"
            @click="usePercentageOfBalance(percent)"
            :data-test="`percentButton-${percent}`"
          >
            {{ percent }}%
          </button>
        </div>
        <button
          class="btn btn-xs btn-ghost mr-2"
          @click="setMaxAmount"
          type="button"
          data-test="max-button"
        >
          Max
        </button>

        <div
          role="button"
          class="flex items-center cursor-pointer badge badge-md badge-info text-xs mr-6"
          @click="() => (isDropdownOpen = !isDropdownOpen)"
          data-test="token-selector"
        >
          <span>{{ formattedTokenSymbol }}</span>
          <IconifyIcon icon="heroicons-outline:chevron-down" class="w-4 h-4" />
        </div>
        <ul
          class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] p-2 shadow"
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
      :disabled="loading || $v.model.amount.$invalid"
      data-test="transferButton"
    >
      Transfer
    </ButtonUI>
    <ButtonUI variant="error" outline @click="$emit('closeModal')">Cancel</ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { isAddress } from 'viem'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { onClickOutside } from '@vueuse/core'
import SelectMemberContractsInput from '../utils/SelectMemberContractsInput.vue'
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
    type?: 'member' | 'contract'
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

const usePercentageOfBalance = (percentage: number) => {
  const balance = parseFloat(model.value.token.balance)
  model.value.amount = ((balance * percentage) / 100).toFixed(4)
}

const isDropdownOpen = ref(false)
const target = ref<HTMLElement | null>(null)

const formattedTokenSymbol = computed(() => {
  const symbol = model.value.token.symbol
  return symbol === 'SepoliaETH' ? 'SepETH' : symbol
})

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

const notExceedBalance = helpers.withMessage('Amount exceeds contract balance', (value: string) => {
  const amount = parseFloat(value)
  const balance = parseFloat(model.value.token.balance)
  return amount <= balance
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
      notZero,
      notExceedBalance
    },
    token: {
      required
    }
  }
}

const $v = useVuelidate(rules, { model })

watch(
  () => model.value.amount,
  (newAmount) => {
    if (newAmount) {
      $v.value.model.amount.$touch()
    }
  }
)

const submitForm = () => {
  $v.value.$touch()
  if ($v.value.$invalid) {
    return
  }
  emit('transfer', model.value)
}

const setMaxAmount = () => {
  model.value.amount = model.value.token.balance
}

// Handle clicking outside of dropdown
onClickOutside(target, () => {
  isDropdownOpen.value = false
})

const handleAmountInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/[^\d.]/g, '')
  const parts = value.split('.')
  if (parts.length > 2) {
    model.value.amount = parts[0] + '.' + parts.slice(1).join('')
  } else {
    model.value.amount = value
  }
}

const handleSelectItem = (item: { name: string; address: string; type: 'member' | 'contract' }) => {
  model.value.address = item
}

onMounted(() => {
  if (props.tokens.length > 0) {
    model.value.token = props.tokens[0]
  }
})
</script>
