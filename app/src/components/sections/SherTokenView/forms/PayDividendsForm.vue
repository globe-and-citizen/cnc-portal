<template>
  <div class="flex flex-col gap-4">
    <h2>Pay Dividends to the shareholders</h2>
    <BodAlert v-if="isBodAction" />
    <h3>
      Please input amount of {{ NETWORK.currencySymbol }} to divide to the shareholders. This will
      move funds from bank contract to the shareholders
    </h3>

    <h6>
      Current Bank contract balance <span v-if="balanceLoading">...</span>
      <span v-else> {{ formatEther(bankBalance?.value ?? 0n) }}</span>
      {{ NETWORK.currencySymbol }}
    </h6>
    <div
      v-if="!balanceLoading && (bankBalance?.value ?? 0n) === 0n"
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
import { useFormStore } from '@/stores/formStore'
import type { Team } from '@/types'
import useVuelidate from '@vuelidate/core'
import { numeric, required } from '@vuelidate/validators'
import { useBalance } from '@wagmi/vue'
import { formatEther, parseEther, type Address } from 'viem'
import { computed, onMounted, watch } from 'vue'
import BodAlert from '@/components/BodAlert.vue'

const formStore = useFormStore()
const amount = computed({
  get: () => formStore.payDividendsAmount,
  set: (value) => (formStore.payDividendsAmount = value)
})
const { addErrorToast } = useToastStore()

const props = defineProps<{
  tokenSymbol: string | undefined
  loading: boolean
  team: Team
  isBodAction: boolean
}>()

const bankAddress = computed(
  () => props.team.teamContracts.find((contract) => contract.type === 'Bank')?.address as Address
)

const {
  data: bankBalance,
  isLoading: balanceLoading,
  error: balanceError,
  refetch: fetchBalance
} = useBalance({
  address: bankAddress.value as Address
})

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
      $validator: (value: number) =>
        parseFloat(formatEther(bankBalance.value?.value ?? 0n)) >= value,
      $message: 'Amount exceeds the current bank balance'
    }
  }
}

const onSubmit = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return

  emits('submit', parseEther((amount.value ?? 0).toString()))
}

const $v = useVuelidate(rules, { amount })

watch(balanceError, () => {
  if (balanceError.value) {
    addErrorToast('Failed to fetch team balance')
  }
})
onMounted(() => {
  fetchBalance()
})

// Function to reset the form
const resetForm = () => {
  console.log('PayDividendsForm: resetForm called - resetting form values')
  formStore.resetForm('payDividends')
  $v.value.$reset()
}

// Expose the resetForm function for parent component
defineExpose({
  resetForm
})
</script>
