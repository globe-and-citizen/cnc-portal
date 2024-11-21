<template>
  <div class="flex flex-col gap-4">
    <h2>Distribute Mint</h2>

    <h3>Please input the amounts to mint to the shareholders</h3>
    <div class="flex flex-col gap-6">
      <div v-for="(shareholder, index) in shareholderWithAmounts" :key="index">
        <h4 class="badge badge-primary">Shareholder {{ index + 1 }}</h4>
        <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
          <p>Address</p>
          |
          <input
            type="text"
            class="grow"
            data-test="address-input"
            v-model="shareholder.shareholder"
          />
        </label>
        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-for="error of $v.shareholderWithAmounts.$each.$response.$errors[index].shareholder"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>
        <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
          <p>Amount</p>
          |
          <input type="number" class="grow" data-test="amount-input" v-model="shareholder.amount" />
          {{ tokenSymbol }}
        </label>
        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-for="error of $v.shareholderWithAmounts.$each.$response.$errors[index].amount"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>
      </div>
    </div>

    <div class="flex justify-end pt-3">
      <div
        class="w-6 h-6 cursor-pointer"
        @click="() => shareholderWithAmounts.push({ shareholder: '', amount: 0 })"
        data-test="plus-icon"
      >
        <PlusCircleIcon class="size-6 text-green-700" />
      </div>
      <div
        class="w-6 h-6 cursor-pointer"
        @click="() => shareholderWithAmounts.length > 1 && shareholderWithAmounts.pop()"
        data-test="minus-icon"
      >
        <MinusCircleIcon class="size-6 text-red-700" />
      </div>
    </div>

    <div class="text-center">
      <LoadingButton v-if="loading" class="w-44" color="primary" />
      <button v-if="!loading" class="btn btn-primary w-44 text-center" @click="onSubmit()">
        Distribute Mint
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingButton from '@/components/LoadingButton.vue'
import { MinusCircleIcon, PlusCircleIcon } from '@heroicons/vue/24/outline'
import useVuelidate from '@vuelidate/core'
import { helpers, numeric, required } from '@vuelidate/validators'
import { parseEther, isAddress } from 'viem'
import { reactive } from 'vue'

const emits = defineEmits(['submit'])
defineProps<{
  tokenSymbol: string
  loading: boolean
}>()
const shareholderWithAmounts = reactive<{ shareholder: string; amount: number }[]>([
  { shareholder: '', amount: 0 }
])
const rules = {
  shareholderWithAmounts: {
    $each: helpers.forEach({
      shareholder: {
        required,
        isAddress: helpers.withMessage('Invalid address', (value: string) => isAddress(value))
      },
      amount: {
        required,
        numeric
      }
    })
  }
}
const $v = useVuelidate(rules, { shareholderWithAmounts })
const onSubmit = () => {
  $v.value.$touch()

  if ($v.value.$invalid) return
  emits(
    'submit',
    shareholderWithAmounts.map((shareholder) => {
      return {
        shareholder: shareholder.shareholder,
        amount: parseEther(shareholder.amount?.toString() ?? '0')
      }
    })
  )
}
</script>
