<template>
  <div class="flex flex-col gap-4">
    <h2>Mint {{ tokenSymbol }}</h2>

    <h3>Please input the {{ input.address ? '' : 'address and ' }}amount to mint</h3>
    <div>
      <SelectMemberInput v-model="input" data-test="address-input" :disabled="props.disabled" />
      <div
        class="pl-4 text-red-500 text-sm w-full text-left"
        data-test="error-address-input"
        v-for="error of $v.input.address.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div>
    </div>

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
          {{ tokenSymbol }}
        </span>
      </div>
      <div
        class="pl-4 text-red-500 text-sm w-full text-left"
        data-test="error-message-amount"
        v-for="error of $v.amount.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div>
    </div>

    <div class="text-center">
      <ButtonUI
        :loading="isConfirmingMint || $v.value?.$invalid"
        :disabled="isConfirmingMint"
        variant="primary"
        class="w-44 text-center"
        @click="onSubmit()"
        data-test="submit-button"
        >Mint
      </ButtonUI>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import useVuelidate from '@vuelidate/core'
import { helpers, numeric, required } from '@vuelidate/validators'
import { isAddress, parseUnits, type Address } from 'viem'
import { onMounted, ref } from 'vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { computed, watch } from 'vue'
import { useTeamStore, useToastStore } from '@/stores'

const amount = ref<number | null>(null)

const props = defineProps<{
  memberInput?: { name: string; address: string }

  disabled?: boolean
}>()

const mintModal = defineModel({ default: false })

const teamStore = useTeamStore()
const { addSuccessToast } = useToastStore()

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorsV1'))

const {
  data: mintHash,
  writeContract: mint,
  isPending: mintLoading,
  error: mintError
} = useWriteContract()
const { isLoading: isConfirmingMint, isSuccess: isSuccessMinting } = useWaitForTransactionReceipt({
  hash: mintHash
})

const emits = defineEmits(['submit'])

const input = ref<{ name: string; address: string }>({
  name: '',
  address: ''
})

const { data: tokenSymbol, error: tokenSymbolError } = useReadContract({
  abi: INVESTOR_ABI,
  address: investorsAddress,
  functionName: 'symbol'
})

const rules = {
  input: {
    address: {
      required,
      isAddress: helpers.withMessage('Invalid address', (value: string) => isAddress(value))
    }
  },
  amount: {
    required,
    numeric,
    minValue: helpers.withMessage('Amount must be greater than 0', (value: number) => value > 0)
  }
}

const $v = useVuelidate(rules, { input, amount })

const onSubmit = () => {
  $v.value.$touch()
  if ($v.value?.$invalid) return
  mint({
    abi: INVESTOR_ABI,
    address: investorsAddress.value as Address,
    functionName: 'individualMint',
    args: [input.value.address as Address, parseUnits(amount.value!.toString(), 6)]
  })
}

onMounted(() => {
  if (props.memberInput) {
    input.value = props.memberInput
  }
})

watch(isConfirmingMint, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isSuccessMinting.value) {
    addSuccessToast('Minted successfully')
    mintModal.value = false
  }
})
</script>
