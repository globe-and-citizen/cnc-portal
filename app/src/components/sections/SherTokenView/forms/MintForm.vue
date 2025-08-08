<template>
  <div class="flex flex-col gap-4">
    <h2>Mint {{ tokenSymbol }}</h2>

    <h3>Please input the {{ input.address ? '' : 'address and' }}amount to mint</h3>
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
import { isAddress } from 'viem'
import { onMounted, ref } from 'vue'
import SelectMemberInput from '@/components/utils/SelectMemberInput.vue'

const amount = ref<number | null>(null)

const props = defineProps<{
  memberInput?: { name: string; address: string }
  tokenSymbol: string | undefined
  loading: boolean
  disabled?: boolean
}>()
const emits = defineEmits(['submit'])

const input = ref<{ name: string; address: string }>({
  name: '',
  address: ''
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

  emits('submit', input.value.address, amount.value!.toString())
}

onMounted(() => {
  if (props.memberInput) {
    input.value = props.memberInput
  }
})
</script>
