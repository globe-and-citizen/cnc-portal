<template>
  <h1 class="font-bold text-2xl mb-5">Approve/Disapprove Users</h1>
  <hr />

  <div v-if="isBodAction">
    <p class="pt-2 text-red-500">This will create a board of directors action</p>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">description</span>
      <input type="text" class="grow" data-test="description-input" v-model="description" />
    </label>
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
              <LoadingButton
                color="error"
                class="w-28"
                v-if="loadingDisapprove && address === addressToDisapprove"
              />
              <button
                v-if="!loadingDisapprove || address !== addressToDisapprove"
                :disabled="loadingDisapprove"
                class="btn btn-error"
                @click="submitDisapprove(address)"
              >
                Disapprove
              </button>
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

    <div class="modal-action justify-center">
      <LoadingButton color="primary" class="w-24" v-if="loadingApprove" />
      <button
        class="btn btn-primary"
        @click="submitApprove"
        v-if="!loadingApprove"
        data-test="transferButton"
      >
        Approve
      </button>
      <button class="btn btn-error" @click="$emit('closeModal')">Cancel</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { isAddress } from 'ethers'

const addressToApprove = ref<string>('')
const addressToDisapprove = ref<string>('')
const description = ref<string>('')

const props = defineProps<{
  loadingApprove: boolean
  loadingDisapprove: boolean
  approvedAddresses: Set<string>
  unapprovedAddresses: Set<string>
  isBodAction: boolean
}>()

const emit = defineEmits(['closeModal', 'approveAddress', 'disapproveAddress'])

const submitApprove = () => {
  if (isAddress(addressToApprove.value))
    emit('approveAddress', addressToApprove.value, description.value)
}

const submitDisapprove = (_addressToDisapprove: string) => {
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
