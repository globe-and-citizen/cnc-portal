<template>
  <div class="flex flex-col gap-4">
    <h2>Mint {{ tokenSymbol }}</h2>

    <h3>Please input the {{ address ? '' : 'address and' }}amount to mint</h3>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
      <p>Address</p>
      |
      <input
        type="text"
        class="grow"
        data-test="address-input"
        v-model="to"
        :disabled="Boolean(address)"
      />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.address.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
      <p>Amount</p>
      |
      <input type="number" class="grow" data-test="amount-input" v-model="amount" />
      {{ tokenSymbol }}
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.amount.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <div class="text-center">
      <LoadingButton v-if="loading" class="w-44" color="primary" />
      <button v-if="!loading" class="btn btn-primary w-44 text-center" @click="onSubmit()">
        Mint
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
import useVuelidate from '@vuelidate/core'
import { helpers, numeric, required } from '@vuelidate/validators'
import { isAddress, type Address } from 'viem'
import { onMounted, ref } from 'vue'

const to = ref<string | null>(null)
const amount = ref<number | null>(null)

const props = defineProps<{
  address?: Address
  tokenSymbol: string | undefined
  loading: boolean
}>()
const emits = defineEmits(['submit'])

const rules = {
  address: {
    required,
    isAddress: helpers.withMessage('Invalid address', isAddress)
  },
  amount: {
    required,
    numeric
  }
}

const onSubmit = () => {
  $v.value.$touch()
  if ($v.value.$invalid) return

  emits('submit', to.value, amount.value!.toString())
}

const $v = useVuelidate(rules, { address: to, amount })

onMounted(() => {
  if (props.address) {
    to.value = props.address
  }
})
</script>
