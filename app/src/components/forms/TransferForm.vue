<template>
  <h1 class="font-bold text-2xl">Transfer from {{ service }} Contract</h1>
  <h3 class="pt-4">Current contract balance: {{ model.token.balance }} {{ model.token.symbol }}</h3>
  <BodAlert v-if="isBodAction" />
  <h3 v-if="expenseBalance" class="pt-4">
    Expense balance: {{ expenseBalance }} {{ model.token.symbol }}
  </h3>

  <div class="flex flex-col mt-4">
    <SelectMemberContractsInput v-model="model.address" @selectItem="handleSelectItem" />

    <div class="flex justify-end">
      <div
        class="pl-4 text-red-500 text-sm text-left"
        v-for="error of $v.model.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div>
    </div>
    <TokenAmount
      :tokens="tokenList"
      v-model:modelValue="model.amount"
      v-model:modelToken="selectedTokenId"
      :isLoading="props.loading"
    >
      <template #label>
        <span class="label-text">Transfer From</span>
        <span class="label-text-alt"
          >Balance: {{ model.token.balance }} {{ model.token.symbol }}
        </span>
      </template>
    </TokenAmount>
  </div>

  <div class="modal-action justify-between mt-4">
    <ButtonUI variant="error" outline @click="$emit('closeModal')">Cancel</ButtonUI>
    <ButtonUI
      variant="primary"
      @click="submitForm"
      :loading="loading"
      :disabled="loading"
      data-test="transferButton"
    >
      Transfer
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { isAddress } from 'viem'
import { required, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import SelectMemberContractsInput from '../utils/SelectMemberContractsInput.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import { SUPPORTED_TOKENS, type TokenId } from '@/constant'
import { ref } from 'vue'
import BodAlert from '@/components/BodAlert.vue'
import TokenAmount from './TokenAmount.vue'

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
// Token list derived from SUPPORTED_TOKENS
const tokenList = computed(() =>
  SUPPORTED_TOKENS.map((token) => ({
    symbol: token.symbol,
    tokenId: token.id,
    name: token.name,
    code: token.code, // Add the missing 'code' property
    balance: props.tokens.find((b) => b.symbol === token.symbol)?.balance ?? 0,
    price: currencyStore.getTokenPrice(token.id)
  }))
)

// watch selectedTokenId to update model.token
watch(selectedTokenId, (newTokenId) => {
  const token = props.tokens.find((b) => b.tokenId === newTokenId)
  if (token) {
    model.value.token = token
  }
})

const rules = {
  model: {
    address: {
      required,
      $valid: helpers.withMessage('Invalid address', (value: { address: string }) => {
        return value.address ? isAddress(value.address) : false
      })
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

const handleSelectItem = (item: { name: string; address: string; type: 'member' | 'contract' }) => {
  model.value.address = item
}

onMounted(() => {
  if (props.tokens.length > 0) {
    model.value.token = props.tokens[0]
  }
})
</script>
