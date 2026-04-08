<template>
  <BodAlert v-if="isBodAction" />

  <UForm
    :schema="validationSchema"
    :state="{ amount: model.amount }"
    class="flex flex-col gap-4"
    @submit="submitForm"
  >
    <SelectMemberContractsInput v-model="model.address" @selectItem="handleSelectItem" />

    <UFormField class="w-full" name="amount">
      <TokenAmount :tokens="tokens" v-model="tokenAmountModel" :isLoading="props.loading">
        <template #label>
          <slot name="label">
            <div class="flex w-full items-center justify-between text-sm font-medium">
              <span>Transfer From</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                Balance: {{ model.token.balance }} {{ model.token.symbol }}
              </span>
            </div>
          </slot>
        </template>
      </TokenAmount>
    </UFormField>

    <!-- Fee breakdown -->
    <div
      v-if="showFees"
      class="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm dark:border-green-800 dark:bg-green-950"
    >
      <div class="flex justify-between">
        <span class="text-gray-500 dark:text-gray-400">Recipient receives</span>
        <span class="font-medium text-gray-800 dark:text-gray-200">
          {{ numericAmount.toFixed(2) }} {{ model.token.symbol }}
        </span>
      </div>

      <div class="flex justify-between">
        <span class="text-gray-500 dark:text-gray-400">
          Deposit fee
          <span
            class="ml-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
          >
            {{ props.feeBps / 100 }}%
          </span>
        </span>
        <span class="text-orange-500">
          + {{ depositFee.toFixed(2) }} {{ model.token.symbol }}
        </span>
      </div>

      <div
        class="flex items-center justify-between border-t border-green-200 pt-2 dark:border-green-800"
      >
        <span class="font-semibold text-gray-800 dark:text-gray-200">Total you send</span>
        <span class="font-bold text-green-600 dark:text-green-400">
          {{ totalToSend.toFixed(2) }} {{ model.token.symbol }}
        </span>
      </div>
    </div>

    <div class="mt-4 flex justify-between">
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        data-test="cancel-button"
        @click="handleClose"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        color="primary"
        :loading="loading"
        :disabled="loading"
        data-test="transferButton"
      >
        {{ showFees ? `Send ${totalToSend.toFixed(2)} ${model.token.symbol}` : 'Transfer' }}
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { z } from 'zod'
import SelectMemberContractsInput from '../utils/SelectMemberContractsInput.vue'
import BodAlert from '@/components/BodAlert.vue'
import TokenAmount from './TokenAmount.vue'
import type { TokenOption } from '@/types'
import type { TokenId } from '@/constant'

export interface TransferModel {
  address: {
    name: string
    address: string
    type?: 'member' | 'trader-safe' | 'contract'
  }
  token: TokenOption
  amount: string
}

const props = withDefaults(
  defineProps<{
    loading: boolean
    tokens: TokenOption[]
    isBodAction?: boolean
    feeBps?: number
  }>(),
  {
    isBodAction: false,
    feeBps: 0
  }
)

const model = defineModel<TransferModel>({
  required: true,
  default: () => ({
    address: { name: '', address: '' },
    token: { symbol: '', balance: 0, tokenId: 'usdc' as TokenId, price: 0, code: 'USD' },
    amount: '0'
  })
})

const emit = defineEmits<{
  transfer: [value: TransferModel]
  closeModal: []
}>()

const selectedTokenId = computed<TokenId>({
  get: () => (model.value.token?.tokenId ?? 'usdc') as TokenId,
  set: (id) => {
    const token = props.tokens.find((t) => t.tokenId === id)
    if (token) model.value.token = token
  }
})

const tokenAmountModel = computed({
  get: () => ({ amount: model.value.amount ?? '', tokenId: selectedTokenId.value }),
  set: (value: { amount: string; tokenId: TokenId }) => {
    model.value.amount = value.amount ?? ''
    selectedTokenId.value = value.tokenId ?? selectedTokenId.value
  }
})

const numericAmount = computed(() => parseFloat(model.value.amount) || 0)
// Exact formula: total * (1 - feeBps/10000) = amount  →  total = amount * 10000 / (10000 - feeBps)
// So fee = amount * feeBps / (10000 - feeBps), ensuring recipient gets exactly `amount` after the contract deducts its cut
const depositFee = computed(() => {
  const bps = props.feeBps ?? 0
  if (bps === 0) return 0
  return (numericAmount.value * bps) / (10000 - bps)
})
const totalToSend = computed(() => numericAmount.value + depositFee.value)
const showFees = computed(() => numericAmount.value > 0 && (props.feeBps ?? 0) > 0)

watch(
  () => props.tokens,
  (tokens) => {
    if (!tokens?.length) return
    if (!tokens.some((t) => t.tokenId === selectedTokenId.value) && tokens[0]) {
      selectedTokenId.value = tokens[0].tokenId
      model.value.token = tokens[0]
    }
  }
)

const validationSchema = computed(() =>
  z.object({
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine((value) => /^\d*\.?\d+$/.test(value), 'Enter a valid amount')
      .refine((value) => parseFloat(value) > 0, 'Amount must be greater than 0')
      .refine(
        (value) => {
          const amount = parseFloat(value)
          const fee = (amount * (props.feeBps ?? 0)) / 10000
          return amount + fee <= (model.value.token.balance ?? 0)
        },
        'Amount + fees exceed available balance'
      )
  })
)

const submitForm = () => {
  emit('transfer', model.value)
}

const handleSelectItem = (item: {
  name: string
  address: string
  type: 'member' | 'trader-safe' | 'contract'
}) => {
  model.value.address = item
}

const handleClose = () => {
  emit('closeModal')
}

onMounted(() => {
  if (props.tokens.length > 0 && props.tokens[0]) {
    model.value.token = props.tokens[0]
  }
})
</script>
