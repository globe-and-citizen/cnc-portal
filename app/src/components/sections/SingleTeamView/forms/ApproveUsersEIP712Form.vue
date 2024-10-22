<template>
  <h1 class="font-bold text-2xl mb-5">Approve/Disapprove Users EIP712</h1>
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
  <div v-for="(input, index) in formData" :key="index" class="input-group mt-3">
    <label class="input input-bordered flex items-center gap-2 input-md">
      <input
        type="text"
        class="w-24"
        v-model="input.name"
        @keyup.stop="
          () => {
            emit('searchUsers', input)
            dropdown = true
          }
        "
        :placeholder="'Member Name ' + (index + 1)"
      />
      |
      <input
        type="text"
        class="grow"
        v-model="input.address"
        @keyup.stop="
          () => {
            emit('searchUsers', input)
            dropdown = true
          }
        "
        :placeholder="'Wallet Address ' + (index + 1)"
      />
      <span class="badge badge-primary">Mandatory</span>
    </label>
  </div>

  <div class="dropdown" :class="{ 'dropdown-open': !!users && users.length > 0 }" v-if="dropdown">
    <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96">
      <li v-for="user in users" :key="user.address">
        <a
          @click="
            () => {
              const l = formData.length - 1
              if (l >= 0) {
                formData[l].name = user.name ?? ''
                formData[l].address = user.address ?? ''
                dropdown = false
              }
            }
          "
        >
          {{ user.name }} | {{ user.address }}
        </a>
      </li>
    </ul>
  </div>

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
                data-test="loading-disapprove"
                color="error"
                class="w-28"
                v-if="loadingDisapprove && address === addressToDisapprove"
              />
              <button
                data-test="disapprove-button"
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

    <div
      data-test="approve-error"
      class="pl-4 text-red-500 text-sm w-full text-left"
      v-for="error of v$.addressToApprove.$errors"
      :key="error.$uid"
    >
      {{ error.$message }}
    </div>

    <div class="modal-action justify-center">
      <LoadingButton
        data-test="loading-approve"
        color="primary"
        class="w-24"
        v-if="loadingApprove"
      />
      <button
        class="btn btn-primary"
        @click="submitApprove"
        v-if="!loadingApprove"
        data-test="approve-button"
      >
        Approve
      </button>
      <button data-test="cancel-button" class="btn btn-error" @click="$emit('closeModal')">
        Cancel
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { isAddress } from 'ethers'
import { useVuelidate } from '@vuelidate/core'
import { helpers } from '@vuelidate/validators'
import type { User } from '@/types'

const props = defineProps<{
  loadingApprove: boolean
  loadingDisapprove: boolean
  approvedAddresses: Set<string>
  unapprovedAddresses: Set<string>
  isBodAction: boolean
  formData: Array<{ name: string; address: string }>
  users: User[]
}>()

const addressToApprove = ref<string>('')
const addressToDisapprove = ref<string>('')
const description = ref<string>('')
const action = ref<'approve' | 'disapprove' | ''>('')
const formData = ref(props.formData)
const dropdown = ref<boolean>(true)

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

const v$ = useVuelidate(rules, { addressToApprove, description })

const emit = defineEmits(['closeModal', 'approveAddress', 'disapproveAddress', 'searchUsers'])

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
