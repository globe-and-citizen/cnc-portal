<template>
  <slot name="header">
    <h3 class="pt-4">
      Current contract balance: {{ model.token.balance }} {{ model.token.symbol }}
    </h3>
  </slot>
  <BodAlert v-if="isBodAction" />

  <div class="flex flex-col mt-4">
    <SelectMemberContractsInput v-model="model.address" @selectItem="handleSelectItem" />

    <div class="flex justify-end" v-if="$v.model.$error">
      <div
        class="pl-4 text-red-500 text-sm text-left"
        v-for="error of $v.model.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
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
import { onMounted, watch } from 'vue'
import { isAddress } from 'viem'
import { required, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '../ButtonUI.vue'
import SelectMemberContractsInput from '../utils/SelectMemberContractsInput.vue'
import { ref } from 'vue'
import BodAlert from '@/components/BodAlert.vue'
import TokenAmount from './TokenAmount.vue'
import type { TokenOption } from '@/types'
import type { TokenId } from '@/constant'

export interface TransferModel {
  address: {
    name: string
    address: string
    type?: 'member' | 'contract'
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

const selectedTokenId = ref<string>('usdc')

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
