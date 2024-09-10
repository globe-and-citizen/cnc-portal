<template>
  <h1 class="font-bold text-2xl mb-5">Approve/Disapprove Users</h1>
  <hr />

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
              <LoadingButton color="error" class="w-24" v-if="loadingDisapprove" />
              <button
                v-if="!loadingDisapprove"
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
  <div class="mt-5" v-if="unapprovedAddresses.size > 0">
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
import { ref } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { isAddress } from 'ethers'

const addressToApprove = ref<string>('')

defineProps<{
  loadingApprove: boolean
  loadingDisapprove: boolean
  approvedAddresses: Set<string>
  unapprovedAddresses: Set<string>
}>()

const emit = defineEmits(['closeModal', 'approveAddress', 'disapproveAddress'])

const submitApprove = () => {
  if (isAddress(addressToApprove.value)) emit('approveAddress', addressToApprove.value)
}

const submitDisapprove = (addressToDisapprove: string) => {
  emit('disapproveAddress', addressToDisapprove)
}
</script>
