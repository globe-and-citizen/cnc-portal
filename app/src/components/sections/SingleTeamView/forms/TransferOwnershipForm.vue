<template>
  <div class="flex flex-col gap-2">
    <h1 class="font-bold text-2xl">Transfer Ownership</h1>
    <h3 class="font-bold text-red-600">This will create an board of director action</h3>
  </div>
  <hr class="" />
  <div class="flex flex-col">
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">New Owner</span>
      <input
        type="text"
        class="grow"
        placeholder="0x123"
        data-test="new-owner-input"
        v-model="newOwner"
      />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.newOwner.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">Description</span>
      <input
        type="text"
        class="grow"
        placeholder="Description"
        data-test="new-owner-input"
        v-model="description"
      />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of $v.description.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
  </div>

  <div class="modal-action justify-center">
    <LoadingButton color="primary min-w-24" v-if="transferOwnershipLoading" />
    <button
      v-else
      class="btn btn-primary"
      data-test="submit-button"
      @click="submitForm(newOwner, description)"
    >
      Submit
    </button>
  </div>
</template>
<script setup lang="ts">
import { required, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import LoadingButton from '@/components/LoadingButton.vue'
import { ref } from 'vue'
import { isAddress } from 'ethers'

const newOwner = ref('')
const description = ref('')
const emits = defineEmits(['transferOwnership'])
const props = defineProps<{
  transferOwnershipLoading: boolean
  asBod: boolean
}>()

const validAddress = helpers.withMessage('Invalid address', (address) => isAddress(address))
const rules = {
  newOwner: {
    required,
    validAddress
  },
  description: {
    required: helpers.withMessage('Description is required', (value: string) => {
      return props.asBod ? value.length > 0 : true
    })
  }
}

const $v = useVuelidate(rules, { newOwner, description })
const submitForm = (newOwner: string, description: string) => {
  $v.value.$touch()
  if ($v.value.$invalid) return
  emits('transferOwnership', newOwner, description)
}
</script>
