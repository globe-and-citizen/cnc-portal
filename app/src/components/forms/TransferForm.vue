<template>
  <h1 class="font-bold text-2xl">Transfer from {{ service }} Contract</h1>
  <h3 class="pt-4">Current contract balance: {{ model.token.balance }} {{ model.token.symbol }}</h3>

  <div class="flex flex-col gap-4 mt-4">
    <SelectMemberContractsInput v-model="model.address" @selectItem="handleSelectItem" />

    <TokenAmount
      :tokens="props.tokens"
      v-model:modelValue="model.amount"
      v-model:modelToken="model.token.tokenId"
      :isLoading="props.loading"
    />
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
import { onMounted, watch } from 'vue'
import { isAddress } from 'viem'
import { required, numeric, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import SelectMemberContractsInput from '../utils/SelectMemberContractsInput.vue'
import TokenAmount from './TokenAmount.vue'
import type { TokenId } from '@/constant'

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

const props = defineProps<{
  loading: boolean
  tokens: Token[]
  service: string
}>()

const model = defineModel<TransferModel>({
  required: true,
  default: () => ({
    address: { name: '', address: '' },
    token: { symbol: '', balance: 0, tokenId: '' },
    amount: '0'
  })
})

const emit = defineEmits(['transfer', 'closeModal'])

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

const handleSelectItem = (item: { name: string; address: string; type: 'member' | 'contract' }) => {
  model.value.address = item
}

onMounted(() => {
  if (props.tokens.length > 0) {
    model.value.token = props.tokens[0]
  }
})
</script>
