<template>
  <h1 class="font-bold text-2xl">Transfer Ownership</h1>
  <hr class="" />
  <div class="flex flex-col gap-5">
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">New Owner</span>
      <input type="text" class="grow" placeholder="0x123" v-model="newOwner" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.newOwner.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
  </div>

  <div class="modal-action justify-center">
    <LoadingButton color="primary min-w-24" v-if="transferOwnershipLoading" />
    <button v-else class="btn btn-primary" @click="submitForm(newOwner)">Submit</button>
  </div>
</template>
<script setup lang="ts">
import { required, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import LoadingButton from '@/components/LoadingButton.vue'
import { ref } from 'vue'
import { isAddress } from 'ethers'

const newOwner = ref('')
const emits = defineEmits(['transferOwnership'])
defineProps<{
  transferOwnershipLoading: boolean
}>()

const validAddress = helpers.withMessage('Invalid address', (address) => isAddress(address))
const rules = {
  newOwner: {
    required,
    validAddress
  }
}

const $v = useVuelidate(rules, { newOwner })
const submitForm = (newOwner: string) => {
  $v.value.$touch()
  if ($v.value.$invalid) return
  emits('transferOwnership', newOwner)
}
</script>
