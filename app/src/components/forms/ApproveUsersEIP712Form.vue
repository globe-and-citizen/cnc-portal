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

  <SelectMemberWithTokenInput v-model="input" />

  <div
    class="pl-4 text-red-500 text-sm w-full text-right"
    v-for="error of v$.input.$errors"
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

  <!-- #region Multi Limit Inputs-->
  <div class="space-y-4 mt-3 mb-3 pt-3 pb-3 border-t">
    <h3 class="text-lg font-semibold">Budget Limits:</h3>
    <div
      v-for="(label, budgetType) in budgetTypes"
      :key="budgetType"
      data-test="budget-limit-input"
    >
      <div class="flex items-center gap-4">
        <!-- Checkbox -->
        <input
          type="checkbox"
          class="toggle toggle-info"
          v-model="selectedOptions[budgetType]"
          :id="'checkbox-' + budgetType"
          :data-test="`limit-checkbox-${budgetType}`"
          @change="toggleOption(budgetType)"
        />
        <!-- Numeric Input -->
        <label class="input input-bordered flex items-center gap-2 input-md mt-2 text-xs w-full">
          <span class="w-48">{{ label }}</span>
          <input
            :disabled="!selectedOptions[budgetType]"
            class="grow"
            type="number"
            v-model.number="values[budgetType]"
            :placeholder="budgetType == 0 ? '0' : '0.00'"
            :data-test="`limit-input-${budgetType}`"
            @input="updateValue(budgetType)"
          />
        </label>
      </div>

      <!-- Display errors specific to this budgetType -->
      <!-- <div v-if="maxTxErrors[0]" class="pl-12 text-red-500 text-sm mt-1">
        <div 
          v-for="(error, index) in maxTxErrors[0][budgetType]" 
          :key="index" 
          data-test="budget-limit-error"
        >
          {{ error }}
        </div>
      </div> -->

      <div class="pl-16 text-red-500 text-sm w-full text-right">
        <div
          v-for="error of v$.resultArray.$errors"
          :key="error.$uid"
          data-test="budget-limit-error"
        >
          <div v-if="error.$validator === '$each'">
            <div v-for="(subError, index) in error.$message" :key="index">
              <div v-if="resultArray[index].budgetType == budgetType">
                <div v-for="(msg, key) in subError" :key="key">
                  {{ msg }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Budget Limit Validation Errors -->
    <div class="pl-4 text-red-500 text-sm w-full text-right">
      <div v-for="error of v$.resultArray.$errors" :key="error.$uid" data-test="budget-limit-error">
        <div v-if="error.$validator === 'required'">
          {{ error.$message }}
        </div>
        <!-- <div v-else-if="error.$validator === '$each'">
          <div v-for="(subError, index) in error.$message" :key="index">
            <div v-for="(msg, key) in subError" :key="key">
              {{ budgetTypes[resultArray[index].budgetType as unknown as 0 | 1 | 2] }}: {{ msg }}
            </div>
          </div>
        </div> -->
      </div>
    </div>
  </div>
  <!-- #endregion Multi Limit Inputs -->

  <hr />

  <div class="mt-3">
    <span class="font-semibold">Expiry date:</span>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <div class="grow" data-test="date-picker">
        <VueDatePicker v-model="date" :min-date="new Date()" auto-apply placeholder="Pick a date" />
      </div>
    </label>
  </div>

  <div
    class="pl-4 text-red-500 text-sm w-full text-right"
    v-for="error of v$.date.$errors"
    :key="error.$uid"
    data-test="date-error"
  >
    {{ error.$message }}
  </div>

  <div class="modal-action justify-center">
    <ButtonUI outline data-test="cancel-button" variant="error" @click="clear"> Cancel </ButtonUI>

    <ButtonUI
      :loading="loadingApprove"
      :disabled="loadingApprove"
      variant="primary"
      @click="submitApprove"
      data-test="approve-button"
    >
      Approve
    </ButtonUI>
  </div>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { isAddress } from 'viem'
import { useVuelidate } from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import type { User } from '@/types'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import ButtonUI from '@/components/ButtonUI.vue'
import SelectMemberWithTokenInput from '@/components/utils/SelectMemberWithTokenInput.vue'

const props = defineProps<{
  loadingApprove: boolean
  isBodAction: boolean
  formData: Array<{ name: string; address: string }>
  users: User[]
}>()

const input = ref({ name: '', address: '', token: '' })
const limitValue = ref('')
const date = ref<Date | string>('')
const description = ref<string>('')
const budgetLimitType = ref<0 | 1 | 2 | null>(null)

//#region multi limit
// Labels for budget types
const budgetTypes = {
  0: 'Max Transactions',
  1: 'Maximum Amount',
  2: 'Max Amount per Transaction'
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
      value: values[budgetType as unknown as 0 | 1 | 2] || 0
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

// const getErrorsForBudgetType = (budgetType: string | number): BudgetError[] => {
//   const key = budgetType.toString();
//   return budgetTypeErrors.value[key] || [];
// };
//#endregion multi limit

const rules = {
  input: {
    address: {
      required: helpers.withMessage('Address is required', required),
      $valid: helpers.withMessage('Invalid wallet address', (value: string) => isAddress(value))
    },
    token: {
      required: helpers.withMessage('Token is required', required)
    }
  },
  description: {
    required: helpers.withMessage('Description is required', (value: string) => {
      return props.isBodAction ? value.length > 0 : true
    })
  },
  // Add validation for budget limits
  resultArray: {
    required: helpers.withMessage('At least one budget limit must be set', (value: unknown[]) => {
      return value.length > 0
    }),
    $each: helpers.forEach({
      value: {
        required: helpers.withMessage('Value is required', required),
        numeric: helpers.withMessage('Must be a positive number', (value: string | number) => {
          return !isNaN(Number(value)) && Number(value) > 0
        }),
        integer: helpers.withMessage('Must be an integer', (value) => {
          const index = resultArray.value.findIndex((item) => item.value === value)
          const budgetType = resultArray.value[index]?.budgetType

          if (budgetType === 0) {
            return Number.isInteger(value)
          }
          return true
        }),
        custom: helpers.withMessage('Must not exceed max amount', (value) => {
          const index = resultArray.value.findIndex((item) => item.value === value)
          const budgetType = resultArray.value[index]?.budgetType

          if (budgetType === 2) {
            const maxPerPeriod = resultArray.value.find((item) => item.budgetType === 1)?.value
            if (maxPerPeriod && Number(value) > Number(maxPerPeriod)) {
              return false
            }
          }

          return true
        })
      }
    })
  },
  // Add date validation
  date: {
    required: helpers.withMessage('Expiry date is required', required),
    futureDate: helpers.withMessage('Expiry date must be in the future', (value: Date | string) => {
      if (!value) return false
      const date = typeof value === 'string' ? new Date(value) : value
      return date > new Date()
    })
  }
}

const v$ = useVuelidate(rules, {
  description,
  input,
  resultArray,
  date
})

const emit = defineEmits(['closeModal', 'approveUser', 'searchUsers'])

interface BudgetError {
  uid: string
  message: string
  validator?: string
}

const maxTxErrors = computed(() => {
  if (v$.value.resultArray.$errors.length) {
    return v$.value.resultArray.$errors
      .filter((error) => error.$validator === '$each')
      .map((error) => {
        console.log('error.$message: ', error.$message)
        console.log('error.$params: ', error.$params)
        console.log('error.$response: ', error.$response)
        return error.$message
      })
  } else return [[], [], []]
})

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
    approvedAddress: input.value.address,
    budgetData: resultArray.value,
    tokenAddress: input.value.token,
    expiry: typeof date.value === 'object' ? Math.floor(date.value.getTime() / 1000) : 0
  })
}

watch(maxTxErrors, (newErrors) => {
  if (newErrors) {
    console.log('maxErrors: ', newErrors)
  }
})
</script>
<style>
.dp__input {
  border: none;
}
</style>
