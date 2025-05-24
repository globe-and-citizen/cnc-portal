<template>
  <h1 class="font-bold text-2xl">Transfer from {{ service }} Contract</h1>
  <h3 class="pt-4">Current contract balance: {{ model.token.balance }} {{ model.token.symbol }}</h3>

  <div class="flex flex-col gap-4 mt-4">
    <SelectMemberContractsInput v-model="model.address" @selectItem="handleSelectItem" />

    <div class="input input-bordered flex items-center gap-2 input-md">
      <div class="grow flex items-center gap-2">
        <input type="number" class="grow" data-test="amount-input" v-model="model.amount" />
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
          @click="
            () => {
              if (tokens.length > 1) {
                isDropdownOpen = !isDropdownOpen
              }
            }
          "
          data-test="token-selector"
        >
          <span>{{ model.token.symbol }}</span>
          <IconifyIcon
            v-if="tokens.length > 1"
            icon="heroicons-outline:chevron-down"
            class="w-4 h-4"
          />
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
import { formatCurrencyShort } from '@/utils'

export interface Token {
  symbol: string
  balance: number
}

export interface TransferModel {
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

const model = defineModel<TransferModel>({
  required: true,
  default: () => ({
    address: { name: '', address: '' },
    token: { symbol: '', balance: 0 },
    amount: '0'
  })
})

const isDropdownOpen = ref(false)
const target = ref<HTMLElement | null>(null)

const emit = defineEmits(['transfer', 'closeModal'])
const currencyStore = useCurrencyStore()

const usePercentageOfBalance = (percentage: number) => {
  model.value.amount = ((model.value.token.balance * percentage) / 100).toFixed(4)
}

// New computed property for transfer amount in default currency
const formattedTransferAmount = computed(() => {
  // Price in local currency
  const value = (Number(model.value.amount) || 0) * (currencyStore.nativeToken.priceInLocal || 0)
  return formatCurrencyShort(value, currencyStore.localCurrency.code)
})

const notZero = helpers.withMessage('Amount must be greater than 0', (value: string) => {
  return parseFloat(value) > 0
})

const notExceedBalance = helpers.withMessage('Amount exceeds contract balance', (value: string) => {
  const amount = parseFloat(value)
  const balance = model.value.token.balance
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
  model.value.amount = model.value.token.balance.toString()
}

// Handle clicking outside of dropdown
onClickOutside(target, () => {
  isDropdownOpen.value = false
})

const handleSelectItem = (item: { name: string; address: string; type: 'member' | 'contract' }) => {
  model.value.address = item
}

onMounted(() => {
  if (props.tokens.length > 0) {
    model.value.token = props.tokens[0]
  }
})
</script>
