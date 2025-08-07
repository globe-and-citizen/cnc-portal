<template>
  <div class="flex flex-col gap-4">
    <h2>Mint {{ tokenSymbol }}</h2>

    <h3>Please input the {{ address ? '' : 'address and' }}amount to mint</h3>

    <SelectMemberInput v-model="memberInput" data-test="address-input" />

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
        :loading="loading || $v.value?.$invalid"
        :disabled="loading"
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
import { isAddress, type Address } from 'viem'
import { onMounted, ref, computed } from 'vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'

const amount = ref<number | null>(null)

const props = defineProps<{
  address?: Address
  tokenSymbol: string | undefined
  loading: boolean
}>()
const emits = defineEmits(['submit'])

const memberInput = ref({
  name: '',
  address: ''
})

const addressInput = computed(() => memberInput.value.address)

const rules = {
  address: {
    required,
    isAddress: helpers.withMessage('Invalid address', isAddress)
  },
  amount: {
    required,
    numeric,
    minValue: helpers.withMessage('Amount must be greater than 0', (value: number) => value > 0)
  }
}

const $v = useVuelidate(rules, { address: addressInput, amount })

const onSubmit = () => {
  $v.value.$touch()
  if ($v.value?.$invalid) return

  emits('submit', memberInput.value.address, amount.value!.toString())
}

onMounted(() => {
  if (props.address) {
    memberInput.value.address = props.address
  }
})
</script>
