<template>
  <div class="flex flex-col gap-4">
    <h2>Pay Dividends to the shareholders</h2>
    <BodAlert v-if="isBodAction" />
    <h3>
      Please input amount to divide to the shareholders. This will move funds from bank contract to
      the shareholders
    </h3>

    <h6>
      Current Bank contract balance

      <span>{{ formattedUnlockedBalance }}</span>
      {{ selectedTokenId === 'native' ? NETWORK.currencySymbol : selectedTokenId.toUpperCase() }}
    </h6>

    <div
      v-if="(formattedUnlockedBalance ?? 0) === 0"
      class="alert alert-warning"
      data-test="bank-empty-warning"
    >
      Please fund the bank contract before paying dividends.
    </div>

    <TokenAmount
      v-model:modelValue="amount"
      v-model:modelToken="selectedTokenId"
      :tokens="tokens"
      :loading="loading"
    >
      <template #label>
        <span class="label-text">Amount</span>
        <span class="label-text-alt">Available: {{ formattedUnlockedBalance }}</span>
      </template>
    </TokenAmount>

    <div class="text-center">
      <ButtonUI
        :loading="loading"
        :disabled="loading || (formattedUnlockedBalance ?? 0) === 0"
        class="btn btn-primary w-44 text-center"
        @click="onSubmit()"
      >
        submit
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { NETWORK } from '@/constant'
// import { useToastStore } from '@/stores'
import type { Team } from '@/types'

import { parseUnits } from 'viem'
import { computed, ref } from 'vue'
import { useTeamStore } from '@/stores'
import BodAlert from '@/components/BodAlert.vue'

import type { TokenId } from '@/constant'
import type { TokenOption } from '@/types'
import { useContractBalance } from '@/composables/useContractBalance'
import TokenAmount from '@/components/forms/TokenAmount.vue'
import type { Address } from 'viem'
const amount = ref<string>('')
const selectedTokenId = ref<TokenId>('native')
const teamStore = useTeamStore()

defineProps<{
  tokenSymbol: string | undefined
  loading: boolean
  team: Team
  isBodAction: boolean
}>()

const bankAddress = teamStore.getContractAddressByType('Bank')
const { balances } = useContractBalance(bankAddress as Address)

const getTokens = (): TokenOption[] =>
  balances.value
    .map((b) => ({
      symbol: b.token.symbol,
      balance: b.amount,
      tokenId: b.token.id,
      price: b.values['USD']?.price ?? 0,
      name: b.token.name,
      code: b.token.code
    }))
    .filter((b) => b.tokenId !== 'sher')

const tokens = computed(() => getTokens())

const selectedTokenDecimals = computed<number>(() => {
  const entry = balances.value.find((b) => b.token.id === selectedTokenId.value)
  return entry?.token.decimals ?? 18
})

const selectedTokenBalance = computed<number>(() => {
  const entry = balances.value.find((b) => b.token.id === selectedTokenId.value)
  return entry?.amount ?? 0
})

const formattedUnlockedBalance = computed(() => {
  return selectedTokenBalance.value
})
// Update maxValue validator to use availableBalance
const emits = defineEmits(['submit'])

const onSubmit = () => {
  if (!amount.value) return
  const parsed = parseUnits(amount.value, selectedTokenDecimals.value)
  emits('submit', parsed, selectedTokenId.value)
}
</script>
