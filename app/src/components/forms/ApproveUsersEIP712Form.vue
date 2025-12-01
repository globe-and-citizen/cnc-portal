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

  <!-- Budget Amount Input -->
  <div class="mt-3">
    <span class="font-semibold">Budget Amount:</span>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">Amount</span>
      <input
        type="number"
        class="grow"
        data-test="amount-input"
        v-model.number="amount"
        placeholder="0.00"
        step="0.01"
        min="0"
      />
      <SelectComponent v-model="frequencyType as unknown as string" :options="frequencyTypes" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-right"
      v-for="error of v$.amount.$errors"
      :key="error.$uid"
      data-test="amount-error"
    >
      {{ error.$message }}
    </div>
  </div>

  <!-- Custom Frequency Input (only shown when Custom is selected) -->
  <div v-if="frequencyType === 4" class="mt-3">
    <span class="font-semibold">Custom Frequency:</span>
    <label class="input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">Days</span>
      <input
        type="number"
        class="grow"
        data-test="custom-frequency-input"
        v-model.number="customFrequencyDays"
        placeholder="7"
        min="1"
        step="1"
      />
    </label>
    <div class="text-xs text-gray-500 mt-1">
      Frequency period in days (will be converted to seconds for the contract)
    </div>
    <div
      class="pl-4 text-red-500 text-sm w-full text-right"
      v-for="error of v$.customFrequencyDays.$errors"
      :key="error.$uid"
      data-test="custom-frequency-error"
    >
      {{ error.$message }}
    </div>
  </div>

  <!-- Date Range -->
  <div class="flex flex-col gap-2 mt-5">
    <div>
      <span class="font-semibold">Duration:</span>
      <label class="input input-bordered flex items-center gap-2 input-md mt-2">
        <span class="w-24">Start Date</span>
        <div class="grow" data-test="start-date-picker">
          <VueDatePicker
            v-model="startDate"
            :min-date="new Date()"
            auto-apply
            placeholder="Pick start date"
          />
        </div>
      </label>
      <div
        class="pl-4 text-red-500 text-sm w-full text-right"
        v-for="error of v$.startDate.$errors"
        :key="error.$uid"
        data-test="start-date-error"
      >
        {{ error.$message }}
      </div>
    </div>

    <div>
      <!-- <span class="font-semibold">End Date:</span> -->
      <label class="input input-bordered flex items-center gap-2 input-md mt-2">
        <span class="w-24">End Date</span>
        <div class="grow" data-test="end-date-picker">
          <VueDatePicker
            v-model="endDate"
            :min-date="startDate || new Date()"
            auto-apply
            placeholder="Pick end date"
          />
        </div>
      </label>
      <div
        class="pl-4 text-red-500 text-sm w-full text-right"
        v-for="error of v$.endDate.$errors"
        :key="error.$uid"
        data-test="end-date-error"
      >
        {{ error.$message }}
      </div>
    </div>
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
import { computed, ref } from 'vue'
import { isAddress } from 'viem'
import { useVuelidate } from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import type { User } from '@/types'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import ButtonUI from '@/components/ButtonUI.vue'
import SelectMemberWithTokenInput from '@/components/utils/SelectMemberWithTokenInput.vue'
import SelectComponent from '@/components/SelectComponent.vue'

const props = defineProps<{
  loadingApprove: boolean
  isBodAction: boolean
  formData: Array<{ name: string; address: string }>
  users: User[]
}>()

const input = ref({ name: '', address: '', token: '' })
const amount = ref<number>(0)
const frequencyType = ref<number>(0) // Default to OneTime
const customFrequencyDays = ref<number>(7) // Default to 7 days
const startDate = ref<Date | string>('')
const endDate = ref<Date | string>('')
const description = ref<string>('')

// Frequency types mapping
const frequencyTypes = [
  { value: 0, label: 'One Time' },
  { value: 1, label: 'Daily' },
  { value: 2, label: 'Weekly' },
  { value: 3, label: 'Monthly' },
  { value: 4, label: 'Custom' }
]

// Convert days to seconds for the contract
const customFrequencyInSeconds = computed(() => {
  return customFrequencyDays.value * 24 * 60 * 60 // days * hours * minutes * seconds
})

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
  amount: {
    required: helpers.withMessage('Budget amount is required', required),
    positive: helpers.withMessage('Amount must be greater than zero', (value: number) => value > 0)
  },
  frequencyType: {
    required: helpers.withMessage('Frequency type is required', required),
    valid: helpers.withMessage(
      'Invalid frequency type',
      (value: number) => value >= 0 && value <= 4
    )
  },
  customFrequencyDays: {
    required: helpers.withMessage(
      'Custom frequency is required when Custom frequency type is selected',
      (value: number) => {
        return frequencyType.value !== 4 || value > 0
      }
    ),
    positive: helpers.withMessage('Custom frequency must be at least 1 day', (value: number) => {
      return frequencyType.value !== 4 || value >= 1
    }),
    integer: helpers.withMessage(
      'Custom frequency must be a whole number of days',
      (value: number) => {
        return frequencyType.value !== 4 || Number.isInteger(value)
      }
    )
  },
  startDate: {
    required: helpers.withMessage('Start date is required', required),
    futureDate: helpers.withMessage('Start date must be in the future', (value: Date | string) => {
      if (!value) return false
      const date = typeof value === 'string' ? new Date(value) : value
      return date > new Date()
    })
  },
  endDate: {
    required: helpers.withMessage('End date is required', required),
    afterStart: helpers.withMessage('End date must be after start date', (value: Date | string) => {
      if (!value || !startDate.value) return false
      const end = typeof value === 'string' ? new Date(value) : value
      const start =
        typeof startDate.value === 'string' ? new Date(startDate.value) : startDate.value
      return end > start
    })
  }
}

const v$ = useVuelidate(rules, {
  description,
  input,
  amount,
  frequencyType,
  customFrequencyDays,
  startDate,
  endDate
})

const emit = defineEmits(['closeModal', 'approveUser', 'searchUsers'])

const clear = () => {
  amount.value = 0
  frequencyType.value = 0
  customFrequencyDays.value = 7
  startDate.value = ''
  endDate.value = ''
  emit('closeModal')
}

const submitApprove = () => {
  v$.value.$touch()
  if (v$.value.$invalid) {
    return
  }

  console.log('This executed...')

  const budgetLimit = {
    approvedAddress: input.value.address,
    amount: amount.value,
    frequencyType: frequencyType.value,
    customFrequency: frequencyType.value === 4 ? customFrequencyInSeconds.value : 0,
    startDate:
      typeof startDate.value === 'object' ? Math.floor(startDate.value.getTime() / 1000) : 0,
    endDate: typeof endDate.value === 'object' ? Math.floor(endDate.value.getTime() / 1000) : 0,
    tokenAddress: input.value.token
  }

  console.log('budgetLimit: ', budgetLimit)

  emit('approveUser', budgetLimit)
}
</script>

<style>
.dp__input {
  border: none;
}
</style>
