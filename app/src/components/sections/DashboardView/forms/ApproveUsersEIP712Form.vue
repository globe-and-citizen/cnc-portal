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
              if (l >= 0 && formData[l]) {
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

  <div>
    <label class="input input-bordered flex items-center gap-2 input-md">
      <span class="w-24">Token</span>
      |
      <select v-model="selectedToken" class="bg-white grow">
        <option disabled :value="null">-- Select a token --</option>
        <option v-for="(address, symbol) of tokens" :value="address" :key="address">
          {{ symbol }}
        </option>
      </select>
    </label>
  </div>

  <div
    data-test="limit-value-error"
    class="pl-4 text-red-500 text-sm w-full text-left"
    v-for="error of v$.selectedToken.$errors"
    :key="error.$uid"
  >
    {{ error.$message }}
  </div>
  <!--Select budget limit type
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
  </div>-->

  <!-- Budget limit value 
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
  </div>-->

  <!-- #region Multi Limit Inputs-->
  <div class="space-y-4 mt-3 mb-3 pt-3 pb-3 border-t">
    <h3 class="text-lg font-semibold">Budget Limits:</h3>
    <div
      v-for="(label, budgetType) in budgetTypes"
      :key="budgetType"
      class="shadow-md"
      data-test="budget-limit-input"
    >
      <label
        :for="'checkbox-' + budgetType"
        class="input input-bordered flex items-center gap-2 input-md mt-2"
      >
        <!-- Checkbox -->
        <input
          type="checkbox"
          class="checkbox checkbox-primary"
          v-model="selectedOptions[budgetType]"
          :id="'checkbox-' + budgetType"
          :data-test="`limit-checkbox-${budgetType}`"
          @change="toggleOption(budgetType)"
        />
        <!-- Numeric Input -->
        <span class="w-48">{{ label }}</span
        >|
        <input
          :disabled="!selectedOptions[budgetType]"
          type="number"
          class="grow pl-4"
          v-model.number="values[budgetType]"
          placeholder="Enter value"
          :data-test="`limit-input-${budgetType}`"
          @input="updateValue(budgetType)"
        />
      </label>
    </div>

    <!-- Display Selected Options -->
    <!--<div class="p-4 mt-6 border-t">
      <h3 class="text-lg font-semibold">Selected Options:</h3>
      <pre class="bg-gray-100 p-4 rounded-lg">{{ resultArray }}</pre>
    </div>-->
  </div>
  <!-- #endregion Multi Limit Inputs -->

  <hr />

  <div class="mt-3">
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">Expiry</span>
      <div class="grow" data-test="date-picker">
        <VueDatePicker v-model="date" />
      </div>
    </label>
  </div>

  <div class="modal-action justify-center">
    <ButtonUI
      :loading="loadingApprove"
      :disabled="loadingApprove"
      variant="primary"
      @click="submitApprove"
      data-test="approve-button"
    >
      Approve
    </ButtonUI>
    <ButtonUI outline data-test="cancel-button" variant="error" @click="clear"> Cancel </ButtonUI>
  </div>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { isAddress, zeroAddress } from 'viem'
import { useVuelidate } from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import type { User } from '@/types'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import ButtonUI from '@/components/ButtonUI.vue'
import { NETWORK, USDC_ADDRESS, USDT_ADDRESS } from '@/constant'

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
const selectedToken = ref<string | null>(null)
const tokens = ref({
  [NETWORK.currencySymbol]: zeroAddress,
  USDC: USDC_ADDRESS,
  USDT: USDT_ADDRESS
})

//#region multi limit
// Labels for budget types
const budgetTypes = {
  0: 'Transactions Per Period',
  1: 'Amount Per Period',
  2: 'Amount Per Transaction'
}

// Reactive states
const selectedOptions = reactive<{ [key in 0 | 1 | 2]: boolean }>({ 0: false, 1: false, 2: false })
const values = reactive<{ [key in 0 | 1 | 2]: null | string | number }>({
  0: null,
  1: null,
  2: null
})

// Result array
const resultArray = computed(() =>
  Object.entries(selectedOptions)
    .filter(([, isSelected]) => isSelected)
    .map(([budgetType]) => ({
      budgetType: Number(budgetType),
      value: values[budgetType as unknown as 0 | 1 | 2] || 0 //,
      //token: selectedToken.value
    }))
)

// Handlers
const toggleOption = (budgetType: 0 | 1 | 2) => {
  if (!selectedOptions[budgetType]) {
    values[budgetType] = null // Reset value if deselected
  }
}

const updateValue = (budgetType: 0 | 1 | 2) => {
  if (values[budgetType] === null || isNaN(Number(values[budgetType]))) {
    values[budgetType] = 0 // Default value if input is empty
  }
}
//#endregion multi limit

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
  selectedToken: { required },
  // limitValue: {
  //   required,
  //   numeric
  // },
  // budgetLimitType: {
  //   required: helpers.withMessage('Budget limit type is required', (value: number | null) => {
  //     return typeof value === 'number' && value >= 0 ? true : false
  //   })
  // },
  description: {
    required: helpers.withMessage('Description is required', (value: string) => {
      return props.isBodAction ? value.length > 0 : true
    })
  }
}

const v$ = useVuelidate(rules, {
  /*budgetLimitType, */ description,
  /*limitValue, */ formData,
  selectedToken
})

const emit = defineEmits(['closeModal', 'approveUser', 'searchUsers'])

const clear = () => {
  limitValue.value = ''
  budgetLimitType.value = null
  date.value = ''
  emit('closeModal')
}

const submitApprove = () => {
  v$.value.$touch()
  if (v$.value.$invalid) {
    return
  }

  emit('approveUser', {
    approvedAddress: formData.value[0]?.address ?? '',
    budgetData: resultArray.value,
    tokenAddress: selectedToken.value,
    expiry: typeof date.value === 'object' ? Math.floor(date.value.getTime() / 1000) : 0
  })
}
</script>
<style>
.dp__input {
  border: none;
}
</style>
