<template>
  <div class="flex flex-col gap-4">
    <h2>Distribute Mint</h2>

    <h3>Please input the amounts to mint to the shareholders</h3>
    <div class="flex flex-col gap-6">
      <div v-for="(shareholder, index) in shareholderWithAmounts" :key="shareholder.shareholder">
        <h4 class="badge badge-primary">Shareholder {{ index + 1 }}</h4>
        <label class="input input-bordered flex items-center gap-2 input-md mt-2 w-full">
          <p>Address</p>
          |
          <input
            type="text"
            class="grow"
            data-test="address-input"
            v-model="shareholder.shareholder"
            disabled="true"
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
import useVuelidate from '@vuelidate/core'
import { helpers, numeric, required } from '@vuelidate/validators'
import { parseEther, type Address } from 'viem'
import { reactive } from 'vue'

const emits = defineEmits(['submit'])
const props = defineProps<{
  shareholders: ReadonlyArray<{ shareholder: Address; amount: bigint }> | undefined
  tokenSymbol: string | undefined
  loading: boolean
}>()
const shareholderWithAmounts = reactive<
  {
    shareholder: Address
    amount: bigint | null
  }[]
>(
  props.shareholders?.map((shareholder) => ({
    shareholder: shareholder.shareholder,
    amount: BigInt(0)
  })) ?? []
)

const rules = {
  shareholderWithAmounts: {
    $each: helpers.forEach({
      shareholder: {
        required
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
