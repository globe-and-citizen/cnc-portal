<template>
  <div class="flex flex-col gap-4">
    <h2>Deposit {{ NETWORK.currencySymbol }} to safe wallet</h2>
    <label class="form-control w-full flex flex-col gap-2">
      <div class="flex flex-row items-center gap-2">
        <h3>Input amount of {{ NETWORK.currencySymbol }} you want to deposit</h3>
      </div>
      <input type="number" placeholder="3" class="input input-bordered" v-model="amount" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.amount.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
    <ButtonUI
      variant="primary"
      class="w-32 self-center"
      :loading="isLoading || loadingTransaction"
      @click="async () => await onSubmit()"
      >Deposit</ButtonUI
    >
  </div>
</template>
<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { NETWORK } from '@/constant'
import { useTeamStore, useToastStore } from '@/stores'
import { log, parseError } from '@/utils'
import useVuelidate from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import { useSendTransaction, useWaitForTransactionReceipt } from '@wagmi/vue'
import { parseEther } from 'viem'
import { ref, watch } from 'vue'

const emits = defineEmits(['close', 'onSuccess'])
const amount = ref<number | undefined>(undefined)
const toastStore = useToastStore()
const teamStore = useTeamStore()
const safeWalletAddress = teamStore.currentTeam?.teamContracts.find(
  (contract) => contract.type == 'SafeWallet'
)?.address

const {
  sendTransactionAsync,
  data: hash,
  error,
  isPending: loadingTransaction
} = useSendTransaction()
const {
  isLoading,
  isSuccess,
  error: waitTransactionError
} = useWaitForTransactionReceipt({
  hash
})

const rules = {
  amount: {
    required: helpers.withMessage('Amount is required.', required)
  }
}

const $v = useVuelidate(rules, { amount })

const onSubmit = async () => {
  const isValid = $v.value.$validate()
  if (!isValid) {
    return
  }

  await sendTransactionAsync({
    to: safeWalletAddress,
    value: parseEther(amount.value!.toString())
  })
}

watch(waitTransactionError, (newVal) => {
  if (newVal) {
    log.error(parseError(error))
    toastStore.addErrorToast('Failed to deposit')
  }
})
watch(error, (newVal) => {
  if (newVal) {
    log.error(parseError(error))
    toastStore.addErrorToast('Failed to deposit')
  }
})
watch(isSuccess, (newVal) => {
  if (newVal) {
    emits('onSuccess')
    emits('close')
  }
})
</script>
