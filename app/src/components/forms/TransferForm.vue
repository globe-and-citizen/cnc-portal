<template>
  <slot name="header">
    <h3 class="pt-4">
      Current contract balance: {{ model.token.balance }} {{ model.token.symbol }}
    </h3>
  </slot>
  <BodAlert v-if="isBodAction" />

  <div class="flex flex-col mt-4">
    <SelectMemberContractsInput v-model="model.address" @selectItem="handleSelectItem" />

    <div class="flex justify-end" v-if="errors.length">
      <div
        class="pl-4 text-red-500 text-sm text-left"
        v-for="(error, index) of errors"
        :key="index"
      >
        {{ error }}
      </div>
    </div>
    <TokenAmount
      :tokens="tokens"
      v-model:modelValue="model.amount"
      v-model:modelToken="selectedTokenId"
      :isLoading="props.loading"
    >
      <template #label>
        <slot name="label">
          <span class="label-text">Transfer From</span>
          <span class="label-text-alt"
            >Balance: {{ model.token.balance }} {{ model.token.symbol }}
          </span>
        </slot>
      </template>
    </TokenAmount>
  </div>

  <div class="modal-action justify-between mt-4">
    <ButtonUI
      variant="error"
      outline
      @click="
        () => {
          $emit('closeModal')
        }
      "
      >Cancel</ButtonUI
    >
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
import { onMounted, ref, watch, computed } from 'vue'
import { isAddress } from 'viem'
import { z } from 'zod'
import ButtonUI from '../ButtonUI.vue'
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
  }>(),
  {
    isBodAction: false
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

const emit = defineEmits(['transfer', 'closeModal'])

// Use a computed with getter/setter so the select binds directly to tokenId
const selectedTokenId = computed<string>({
  get: () => model.value.token?.tokenId ?? 'usdc',
  set: (id) => {
    const token = props.tokens.find((t) => t.tokenId === id)
    if (token) model.value.token = token
  }
})

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
const transferSchema = z.object({
  address: z.object({
    name: z.string(),
    address: z.string(),
    type: z.enum(['member', 'trader-safe', 'contract']).optional()
  }).refine((val) => val.address ? isAddress(val.address) : false, {
    message: 'Invalid address'
  }),
  token: z.object({
    symbol: z.string().min(1),
    balance: z.number(),
    tokenId: z.string(),
    price: z.number(),
    code: z.string()
  }),
  amount: z.string()
})

const errors = ref<string[]>([])

const submitForm = () => {
  const result = transferSchema.safeParse(model.value)
  if (!result.success) {
    errors.value = result.error.errors.map((e) => e.message)
    return
  }
  errors.value = []
  emit('transfer', model.value)
}

const handleSelectItem = (item: {
  name: string
  address: string
  type: 'member' | 'trader-safe' | 'contract'
}) => {
  model.value.address = item
}

onMounted(() => {
  if (props.tokens.length > 0 && props.tokens[0]) {
    model.value.token = props.tokens[0]
  }
})
</script>
