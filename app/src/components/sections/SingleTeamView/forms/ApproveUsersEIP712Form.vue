<template>
  <h1 class="font-bold text-2xl mb-5">Approve User EIP712</h1>
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

  <!--Search user to approve-->
  <div v-for="(input, index) in formData" :key="index" class="input-group mt-3 mb-2">
    <label class="input input-bordered flex items-center gap-2 input-md">
      <input
        type="text"
        class="w-24"
        :data-test="`name-input-${index}`"
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
        :data-test="`address-input-${index}`"
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

  <div
    class="pl-4 text-red-500 text-sm w-full text-left"
    v-for="error of v$.formData.$errors"
    :key="error.$uid"
    data-test="address-error"
  >
    <div v-if="Array.isArray(error.$message)">
      <div v-for="(errorObj, index) of error.$message" :key="index">
        <div v-for="(error, index1) of errorObj" :key="index1">
          {{ error }}
        </div>
      </div>
    </div>
    <div v-else>
      {{ error.$message }}
    </div>
  </div>

  <!--Select budget limit type-->
  <div>
    <label class="input input-bordered flex items-center gap-2 input-md">
      <select v-model="budgetLimitType" class="bg-white grow">
        <option disabled :value="null">-- Select a budget limit type --</option>
        <option v-for="type of budgetLimitTypes" :key="type.id" :value="type.id">
          {{ type.name }}
        </option>
      </select>
    </label>
  </div>

  <div
    data-test="limit-type-error"
    class="pl-4 text-red-500 text-sm w-full text-left"
    v-for="error of v$.budgetLimitType.$errors"
    :key="error.$uid"
  >
    {{ error.$message }}
  </div>

  <!-- Budget limit value -->
  <div>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">Limit</span>
      <input
        type="text"
        class="grow pl-4"
        data-test="limit-value-input"
        v-model="limitValue"
        placeholder="Enter a limit value"
      />
    </label>
  </div>

  <div
    data-test="limit-value-error"
    class="pl-4 text-red-500 text-sm w-full text-left"
    v-for="error of v$.limitValue.$errors"
    :key="error.$uid"
  >
    {{ error.$message }}
  </div>

  <div class="mt-2">
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">Expiry</span>
      <div class="grow" data-test="date-picker">
        <VueDatePicker v-model="date" />
      </div>
    </label>
  </div>

  <div class="modal-action justify-center">
    <LoadingButton data-test="loading-approve" color="primary" class="w-24" v-if="loadingApprove" />
    <button
      class="btn btn-primary"
      @click="submitApprove"
      v-if="!loadingApprove"
      data-test="approve-button"
    >
      Approve
    </button>
    <button
      data-test="cancel-button"
      class="btn btn-error"
      @click="clear"
      :disabled="loadingApprove"
    >
      Cancel
    </button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { isAddress } from 'ethers'
import { useVuelidate } from '@vuelidate/core'
import { helpers, numeric, required } from '@vuelidate/validators'
import type { User } from '@/types'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'

const props = defineProps<{
  loadingApprove: boolean
  isBodAction: boolean
  formData: Array<{ name: string; address: string }>
  users: User[]
}>()

const limitValue = ref('')
const date = ref<Date | string>('')
const description = ref<string>('')
const formData = ref(props.formData)
const dropdown = ref<boolean>(false)
const budgetLimitType = ref<0 | 1 | 2 | null>(null)
const budgetLimitTypes = ref([
  { id: 0, name: 'Transactions per period' },
  { id: 1, name: 'Amount per period' },
  { id: 2, name: 'Amount per transaction' }
])
const web3Library = new EthersJsAdapter()

const rules = {
  formData: {
    $each: helpers.forEach({
      address: {
        required: helpers.withMessage('Address is required', required),
        $valid: helpers.withMessage('Invalid wallet address', (value: string) => isAddress(value))
      }
    }),

    $valid: helpers.withMessage(
      'At least one member is required',
      (value: Array<{ name: string; address: string }>) => {
        return value.some((v) => v.address)
      }
    )
  },
  limitValue: {
    required,
    numeric
  },
  budgetLimitType: {
    required: helpers.withMessage('Budget limit type is required', (value: number | null) => {
      return typeof value === 'number' &&  
        value >= 0 ? true : false
    })
  },
  description: {
    required: helpers.withMessage('Description is required', (value: string) => {
      return props.isBodAction ? value.length > 0 : true
    })
  }
}

const v$ = useVuelidate(rules, { budgetLimitType, description, limitValue, formData })

const emit = defineEmits(['closeModal', 'approveUser', 'searchUsers'])

const clear = () => {
  limitValue.value = ''
  budgetLimitType.value = null
  date.value = ''
}

const submitApprove = () => {
  v$.value.$touch()
  if (v$.value.$invalid) {
    return
  }
  emit('approveUser', {
    approvedAddress: formData.value[0].address,
    budgetType: budgetLimitType.value,
    value:
      budgetLimitType.value === 0
        ? Number(limitValue.value)
        : web3Library.parseEther(limitValue.value),
    expiry: typeof date.value === 'object' ? Math.floor(date.value.getTime() / 1000) : 0
  })
}
</script>
<style>
.dp__input {
  border: none;
}
</style>
