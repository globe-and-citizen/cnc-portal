<template>
  <h1 class="font-bold text-2xl mb-5">Approve User EIP712</h1>
  <hr />

  <div v-if="isBodAction">
    <p data-test="bod-notification" class="pt-2 text-red-500">
      This will create a board of directors action
    </p>
    <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
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
      v-if="validationErrors['description']"
    >
      {{ validationErrors['description'] }}
    </div>
  </div>

  <SelectMemberWithTokenInput v-model="input" />

  <div
    class="pl-4 text-red-500 text-sm w-full text-right"
    v-if="validationErrors['input.address'] || validationErrors['input.token']"
    data-test="address-error"
  >
    {{ validationErrors['input.address'] || validationErrors['input.token'] }}
  </div>

  <!-- Budget Amount Input -->
  <div class="mt-3">
    <span class="font-semibold">Budget Amount:</span>
    <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
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
      v-if="validationErrors['amount']"
      data-test="amount-error"
    >
      {{ validationErrors['amount'] }}
    </div>
  </div>

  <!-- Custom Frequency Input (only shown when Custom is selected) -->
  <div v-if="frequencyType === 4" class="mt-3">
    <span class="font-semibold">Custom Frequency:</span>
    <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
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
      v-if="validationErrors['customFrequencyDays']"
      data-test="custom-frequency-error"
    >
      {{ validationErrors['customFrequencyDays'] }}
    </div>
  </div>

  <!-- Date Range -->
  <div class="flex flex-col gap-2 mt-5">
    <div>
      <span class="font-semibold">Duration:</span>
      <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
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
        v-if="validationErrors['startDate']"
        data-test="start-date-error"
      >
        {{ validationErrors['startDate'] }}
      </div>
    </div>

    <div>
      <!-- <span class="font-semibold">End Date:</span> -->
      <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
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
        v-if="validationErrors['endDate']"
        data-test="end-date-error"
      >
        {{ validationErrors['endDate'] }}
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
import { z } from 'zod'
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

const approveSchema = computed(() =>
  z.object({
    input: z.object({
      address: z.string().min(1, 'Address is required').refine((val) => isAddress(val), {
        message: 'Invalid wallet address'
      }),
      token: z.string().min(1, 'Token is required')
    }),
    description: z.string().refine((val) => {
      return props.isBodAction ? val.length > 0 : true
    }, { message: 'Description is required' }),
    amount: z.coerce.number().positive('Amount must be greater than zero'),
    frequencyType: z.coerce.number().min(0).max(4, 'Invalid frequency type'),
    customFrequencyDays: z.coerce.number().refine((val) => {
      return frequencyType.value !== 4 || (val > 0 && val >= 1 && Number.isInteger(val))
    }, { message: 'Custom frequency must be a whole number of at least 1 day' }),
    startDate: z.any().refine((val) => val !== null && val !== undefined && val !== '', {
      message: 'Start date is required'
    }),
    endDate: z.any().refine((val) => val !== null && val !== undefined && val !== '', {
      message: 'End date is required'
    })
  }).refine((data) => {
    if (!data.endDate || !data.startDate) return true
    const end = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate as Date
    const start = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate as Date
    return end > start
  }, { message: 'End date must be after start date', path: ['endDate'] })
)

const validationErrors = ref<Record<string, string>>({})

function validateForm() {
  const result = approveSchema.value.safeParse({
    input: input.value,
    description: description.value,
    amount: amount.value,
    frequencyType: frequencyType.value,
    customFrequencyDays: customFrequencyDays.value,
    startDate: startDate.value,
    endDate: endDate.value
  })
  validationErrors.value = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path.join('.')
      if (!validationErrors.value[key]) {
        validationErrors.value[key] = issue.message
      }
    }
    return false
  }
  return true
}

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
  if (!validateForm()) {
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
