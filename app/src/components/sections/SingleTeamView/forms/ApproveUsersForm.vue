<template>
  <h1 class="font-bold text-2xl mb-5">Approve/Disapprove Users</h1>
  <hr />

  <div v-if="isBodAction">
    <p data-test="bod-notification" class="pt-2 text-red-500">
      This will create a board of directors action
    </p>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">description</span>
      <input
        type="text"
        class="grow"
        data-test="description-input"
        v-model="description"
        placeholder="Enter a description"
      />
    </label>
    <div
      data-test="description-error"
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of v$.description.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>
  </div>
  <!--List of approved addressed with dissaprove button on each-->
  <div v-if="approvedAddresses.size > 0" class="mt-5">
    <div class="text-lg font-medium">Approved Addresses</div>
    <div class="overflow-x-auto border border-gray-300 rounded-lg">
      <table class="table table-zebra">
        <tbody>
          <tr v-for="(address, index) of approvedAddresses" :key="index">
            <th>{{ index + 1 }}</th>
            <td>{{ `${address.slice(0, 10)}...${address.slice(-10)}` }}</td>
            <td class="flex justify-end">
              <ButtonUI
                data-test="disapprove-button"
                :loading="loadingDisapprove || address !== addressToDisapprove"
                :disabled="loadingDisapprove"
                variant="error"
                @click="submitDisapprove(address)"
              >
                Disapprove
              </ButtonUI>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="mt-5 gap-2" v-if="unapprovedAddresses.size > 0">
    <div class="text-lg font-medium">Unapproved Addresses</div>
    <label class="input input-bordered flex items-center gap-2 input-md">
      <select v-model="addressToApprove" class="bg-white">
        <option disabled value="">-- Select an address to approve --</option>
        <option v-for="(address, index) of unapprovedAddresses" :key="index" :value="address">
          {{ address }}
        </option>
      </select>
    </label>

    <div
      data-test="approve-error"
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of v$.addressToApprove.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <div class="modal-action justify-center">
      <ButtonUI
        :loading="loadingApprove"
        :disabled="loadingApprove"
        variant="primary"
        @click="submitApprove"
        v-if="!loadingApprove"
        data-test="approve-button"
      >
        Approve
      </ButtonUI>
      <ButtonUI data-test="cancel-button" variant="error" @click="$emit('closeModal')">
        Cancel
      </ButtonUI>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { isAddress } from 'ethers'
import { useVuelidate } from '@vuelidate/core'
import { helpers } from '@vuelidate/validators'
import ButtonUI from '@/components/ButtonUI.vue'

const addressToApprove = ref<string>('')
const addressToDisapprove = ref<string>('')
const description = ref<string>('')
const action = ref<'approve' | 'disapprove' | ''>('')
const rules = {
  addressToApprove: {
    required: helpers.withMessage('Address is required', (value: string) => {
      return action.value === 'approve' ? isAddress(value) : true
    })
  },
  description: {
    required: helpers.withMessage('Description is required', (value: string) => {
      return props.isBodAction ? value.length > 0 : true
    })
  }
}

const props = defineProps<{
  loadingApprove: boolean
  loadingDisapprove: boolean
  approvedAddresses: Set<string>
  unapprovedAddresses: Set<string>
  isBodAction: boolean
}>()

const v$ = useVuelidate(rules, { addressToApprove, description })

const emit = defineEmits(['closeModal', 'approveAddress', 'disapproveAddress'])

const submitApprove = () => {
  action.value = 'approve'
  v$.value.$touch()
  if (v$.value.$invalid) {
    return
  }
  action.value = ''
  if (isAddress(addressToApprove.value))
    emit('approveAddress', addressToApprove.value, description.value)
}

const submitDisapprove = (_addressToDisapprove: string) => {
  action.value = 'disapprove'
  v$.value.$touch()
  if (v$.value.$invalid) {
    return
  }
  action.value = ''
  addressToDisapprove.value = _addressToDisapprove
  emit('disapproveAddress', _addressToDisapprove, description.value)
}

watch(
  () => props.loadingApprove,
  (newVal) => {
    if (newVal) return
    addressToApprove.value = ''
  }
)
</script>
