<template>
  <div class="flex flex-col gap-4">
    <h2>Pay Dividends to the shareholders</h2>
    <BodAlert v-if="isBodAction" />
    <h3>
      Please input amount of {{ NETWORK.currencySymbol }} to divide to the shareholders. This will
      move funds from bank contract to the shareholders
    </h3>

    <h6>
      Current Bank contract balance
      <span v-if="isBankBalanceLoading">...</span>
      <span v-else> {{ formattedUnlockedBalance }}</span>
      {{ NETWORK.currencySymbol }}
    </h6>
    <div
      v-if="!isBankBalanceLoading && (unlockedBalance ?? 0n) === 0n"
      class="alert alert-warning"
      data-test="bank-empty-warning"
    >
      Please fund the bank contract before paying dividends.
    </div>
    <!-- <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
      <p>Amount</p>
      |
      <input type="number" class="grow" data-test="amount-input" v-model="amount" />
      {{ NETWORK.currencySymbol }}
    </label> -->

    <div class="flex flex-col gap-2">
      <label class="flex items-center">
        <span class="w-full font-bold" data-test="amount-input">Amount</span>
      </label>
      <div class="relative">
        <input
          type="number"
          class="input input-bordered input-md grow w-full pr-16"
          data-test="amount-input"
          v-model="amount"
        />
        <span
          class="absolute right-4 top-1/2 transform -translate-y-1/2 text-black font-bold text-sm"
        >
          {{ NETWORK.currencySymbol }}
        </span>
      </div>
      <div
        class="pl-4 text-red-500 text-sm w-full text-left"
        v-for="error of $v.amount.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div>
    </div>

    <div class="text-center">
      <ButtonUI
        :loading="loading"
        :disabled="loading"
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
import { useToastStore } from '@/stores'
import type { Team } from '@/types'
import useVuelidate from '@vuelidate/core'
import { numeric, required } from '@vuelidate/validators'

import { formatEther, parseEther, type Address } from 'viem'
import { computed, onMounted, watch, type Ref } from 'vue'
import { ref } from 'vue'
import BodAlert from '@/components/BodAlert.vue'
import { useBankReads } from '@/composables/bank/index'

const amount = ref<number | null>(null)

const props = defineProps<{
  tokenSymbol: string | undefined
  loading: boolean
  team: Team
  isBodAction: boolean
}>()

const { useUnlockedBalance } = useBankReads()

const {
  data: unlockedBalance,
  isLoading: isBankBalanceLoading,
  error: bankBalanceError
} = useUnlockedBalance() as {
  data: Ref<bigint | undefined>
  isLoading: Ref<boolean>
  error: Ref<unknown>
}

const formattedUnlockedBalance = computed(() => {
  return formatEther(unlockedBalance?.value ?? 0n)
})
// Update maxValue validator to use availableBalance
const emits = defineEmits(['submit'])

const rules = {
  amount: {
    required,
    numeric,
    minValue: {
      $validator: (value: number) => value > 0,
      $message: 'Value should be greater than 0'
    },
    maxValue: {
      $validator: (value: number) => parseFloat(formattedUnlockedBalance.value) >= value,
      $message: 'Amount exceeds the current available balance'
    }
  }
}

const onSubmit = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return

  emits('submit', parseEther((amount.value ?? 0).toString()))
}

const $v = useVuelidate(rules, { amount })

watch(bankBalanceError, (err) => {
  if (err) {
    console.error('Error fetching bank balance:', err)
  }
})
</script>
