<template>
  <h1 class="font-bold text-2xl">Transfer from {{ service }} Contract</h1>
  <h3 class="pt-4">Current contract balance: {{ model.token.balance }} {{ model.token.symbol }}</h3>
  <BodAlert v-if="isBodAction" />
  <h3 v-if="expenseBalance" class="pt-4">
    Expense balance: {{ expenseBalance }} {{ model.token.symbol }}
  </h3>

  <div class="flex flex-col gap-4 mt-4">
    <SelectMemberContractsInput v-model="model.address" @selectItem="handleSelectItem" />

    <div class="input-group relative">
      <label class="input input-bordered flex items-center gap-2 input-md">
        <input
          type="text"
          class="grow min-w-0 h-full"
          data-test="amount-input"
          v-model="model.amount"
        />
        <div class="flex flex-nowrap min-w-0 items-center h-full">
          <!-- Added flex-nowrap and min-w-0 -->
          <div class="flex gap-1 shrink-0 items-center" data-test="percentage-buttons">
            <!-- Added shrink-0 -->
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
            class="btn btn-xs btn-ghost mr-2 shrink-0"
            @click="setMaxAmount"
            type="button"
            data-test="max-button"
          >
            Max
          </button>

          <div class="min-w-[100px] items-center">
            <!-- Wrapped Select in container with min-width -->
            <SelectComponent
              :options="props.tokens.map((token) => ({ value: token.symbol, label: token.symbol }))"
              :disabled="props.loading"
              v-model="selectedTokenId"
              :format-value="
                (value: string) => {
                  return value === 'SepoliaETH' ? 'SepETH' : value
                }
              "
            />
          </div>
        </div>
      </label>
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
import { computed, onMounted, watch } from 'vue'
import { isAddress } from 'viem'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import SelectMemberContractsInput from '../utils/SelectMemberContractsInput.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import { formatCurrencyShort } from '@/utils'
import SelectComponent from '../SelectComponent.vue'
import type { TokenId } from '@/constant'
import { ref } from 'vue'
import BodAlert from '@/components/BodAlert.vue'

export interface Token {
  symbol: string
  balance: number
  tokenId: TokenId
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

const props = withDefaults(
  defineProps<{
    loading: boolean
    tokens: Token[]
    service: string
    isBodAction?: boolean
    expenseBalance?: number | null
  }>(),
  {
    isBodAction: false
  }
)

const model = defineModel<TransferModel>({
  required: true,
  default: () => ({
    address: { name: '', address: '' },
    token: { symbol: '', balance: 0, tokenId: '' },
    amount: '0'
  })
})

const emit = defineEmits(['transfer', 'closeModal'])
const currencyStore = useCurrencyStore()

const selectedTokenId = ref<string>('USDC')

// watch selectedTokenId to update model.token
watch(selectedTokenId, (newTokenId) => {
  const token = props.tokens.find((b) => b.symbol === newTokenId)
  if (token) {
    model.value.token = token
  }
})

const usePercentageOfBalance = (percentage: number) => {
  model.value.amount = ((model.value.token.balance * percentage) / 100).toFixed(4)
}

// New computed property for transfer amount in default currency
const formattedTransferAmount = computed(() => {
  const tokenInfo = currencyStore.getTokenInfo(model.value.token?.tokenId as TokenId)
  const priceObj = tokenInfo?.prices.find((p) => p.id === 'local')
  const price = priceObj?.price ?? 0
  const value = (Number(model.value.amount) || 0) * price
  return formatCurrencyShort(value, priceObj?.code ?? 'USD')
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

const handleSelectItem = (item: { name: string; address: string; type: 'member' | 'contract' }) => {
  model.value.address = item
}

onMounted(() => {
  if (props.tokens.length > 0) {
    model.value.token = props.tokens[0]
  }
})
</script>
