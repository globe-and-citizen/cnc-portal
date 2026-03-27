<template>
  <h1 class="font-bold text-2xl mb-5">Approve User EIP712</h1>
  <hr />

  <div v-if="isBodAction">
    <p data-test="bod-notification" class="pt-2 text-red-500">
      This will create a board of directors action
    </p>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">description</span>
      <UInput
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
      v-if="errors.description"
    >
      {{ errors.description }}
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
    <ul class="p-2 shadow-sm menu dropdown-content z-1 bg-base-100 rounded-box w-96">
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
    v-if="errors.formData"
    data-test="address-error"
  >
    {{ errors.formData }}
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
    v-if="errors.selectedToken"
  >
    {{ errors.selectedToken }}
  </div>

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
        <input
          type="checkbox"
          class="checkbox checkbox-primary"
          v-model="selectedOptions[budgetType]"
          :id="'checkbox-' + budgetType"
          :data-test="`limit-checkbox-${budgetType}`"
          @change="toggleOption(budgetType)"
        />
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
    <UButton
      :loading="loadingApprove"
      :disabled="loadingApprove"
      color="primary"
      @click="submitApprove"
      data-test="approve-button"
    >
      Approve
    </UButton>
    <UButton
      variant="outline"
      data-test="cancel-button"
      color="error"
      @click="clear"
      label="Cancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { isAddress, zeroAddress } from 'viem'
import { z } from 'zod'
import type { User } from '@/types'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
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

const errors = reactive({ description: '', formData: '', selectedToken: '' })

//#region multi limit
const budgetTypes = {
  0: 'Transactions Per Period',
  1: 'Amount Per Period',
  2: 'Amount Per Transaction'
} as const

type BudgetTypeKey = keyof typeof budgetTypes
type BudgetTypeStringKey = `${BudgetTypeKey}`

const selectedOptions = reactive<Record<BudgetTypeStringKey, boolean>>({
  '0': false,
  '1': false,
  '2': false
})
const values = reactive<Record<BudgetTypeStringKey, null | string | number>>({
  '0': null,
  '1': null,
  '2': null
})

const resultArray = computed(() =>
  Object.entries(selectedOptions)
    .filter(([, isSelected]) => isSelected)
    .map(([budgetType]) => ({
      budgetType: Number(budgetType),
      value: values[budgetType as BudgetTypeStringKey] || 0
    }))
)

const toggleOption = (budgetType: BudgetTypeStringKey) => {
  if (!selectedOptions[budgetType]) {
    values[budgetType] = null
  }
}

const updateValue = (budgetType: BudgetTypeStringKey) => {
  if (values[budgetType] === null || isNaN(Number(values[budgetType]))) {
    values[budgetType] = 0
  }
}
//#endregion multi limit

const schema = computed(() =>
  z.object({
    formData: z
      .array(z.object({ name: z.string(), address: z.string() }))
      .refine(
        (v) => v.some((item) => isAddress(item.address)),
        'At least one valid address is required'
      ),
    selectedToken: z
      .string()
      .nullable()
      .refine((v) => v !== null, 'Token is required'),
    description: z
      .string()
      .refine((v) => !props.isBodAction || v.length > 0, 'Description is required')
  })
)

const emit = defineEmits(['closeModal', 'approveUser', 'searchUsers'])

const clear = () => {
  limitValue.value = ''
  budgetLimitType.value = null
  date.value = ''
  emit('closeModal')
}

const submitApprove = () => {
  errors.description = ''
  errors.formData = ''
  errors.selectedToken = ''

  const result = schema.value.safeParse({
    formData: formData.value,
    selectedToken: selectedToken.value,
    description: description.value
  })

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof typeof errors
      if (field in errors && !errors[field]) {
        errors[field] = issue.message
      }
    }
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
