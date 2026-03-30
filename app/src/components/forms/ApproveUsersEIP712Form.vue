<template>
  <div v-if="isBodAction">
    <p data-test="bod-notification" class="pt-2 text-red-500">
      This will create a board of directors action
    </p>
    <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
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

  <SelectMemberWithTokenInput v-model="input" />

  <div
    class="pl-4 text-red-500 text-sm w-full text-right"
    v-if="errors.input"
    data-test="address-error"
  >
    {{ errors.input }}
  </div>

  <!-- Budget Amount Input -->
  <div class="mt-3">
    <span class="font-semibold">Budget Amount:</span>
    <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">Amount</span>
      <UInput
        type="number"
        class="grow"
        data-test="amount-input"
        :model-value="amount"
        @update:model-value="(v: string | number) => (amount = Number(v))"
        placeholder="0.00"
        step="0.01"
        min="0"
      />
      <SelectComponent v-model="frequencyType as unknown as string" :options="frequencyTypes" />
    </label>
    <div
      class="pl-4 text-red-500 text-sm w-full text-right"
      v-if="errors.amount"
      data-test="amount-error"
    >
      {{ errors.amount }}
    </div>
  </div>

  <!-- Custom Frequency Input (only shown when Custom is selected) -->
  <div v-if="frequencyType === 4" class="mt-3">
    <span class="font-semibold">Custom Frequency:</span>
    <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
      <span class="w-24">Days</span>
      <UInput
        type="number"
        class="grow"
        data-test="custom-frequency-input"
        :model-value="customFrequencyDays"
        @update:model-value="(v: string | number) => (customFrequencyDays = Number(v))"
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
      v-if="errors.customFrequencyDays"
      data-test="custom-frequency-error"
    >
      {{ errors.customFrequencyDays }}
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
        v-if="errors.startDate"
        data-test="start-date-error"
      >
        {{ errors.startDate }}
      </div>
    </div>

    <div>
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
        v-if="errors.endDate"
        data-test="end-date-error"
      >
        {{ errors.endDate }}
      </div>
    </div>
  </div>

  <div class="modal-action justify-center">
    <UButton
      color="error"
      variant="outline"
      data-test="cancel-button"
      @click="clear"
      label="Cancel"
    />
    <UButton
      :loading="loadingApprove"
      :disabled="loadingApprove"
      color="primary"
      @click="submitApprove"
      data-test="approve-button"
      label="Approve"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { isAddress } from 'viem'
import { z } from 'zod'
import type { User } from '@/types'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
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
const frequencyType = ref<number>(0)
const customFrequencyDays = ref<number>(7)
const startDate = ref<Date | string>('')
const endDate = ref<Date | string>('')
const description = ref<string>('')

const frequencyTypes = [
  { value: 0, label: 'One Time' },
  { value: 1, label: 'Daily' },
  { value: 2, label: 'Weekly' },
  { value: 3, label: 'Monthly' },
  { value: 4, label: 'Custom' }
]

const customFrequencyInSeconds = computed(() => customFrequencyDays.value * 24 * 60 * 60)

const errors = reactive({
  input: '',
  description: '',
  amount: '',
  customFrequencyDays: '',
  startDate: '',
  endDate: ''
})

const schema = computed(() =>
  z.object({
    input: z.object({
      address: z
        .string()
        .min(1, 'Address is required')
        .refine((v) => isAddress(v), 'Invalid wallet address'),
      token: z.string().min(1, 'Token is required')
    }),
    description: z
      .string()
      .refine((v) => !props.isBodAction || v.length > 0, 'Description is required'),
    amount: z.number().refine((v) => v > 0, 'Amount must be greater than zero'),
    customFrequencyDays: z
      .number()
      .refine(
        (v) => frequencyType.value !== 4 || v >= 1,
        'Custom frequency must be at least 1 day'
      ),
    startDate: z.union([z.instanceof(Date), z.string()]).refine((v) => {
      if (!v) return false
      const d = typeof v === 'string' ? new Date(v) : v
      return d > new Date()
    }, 'Start date must be in the future'),
    endDate: z.union([z.instanceof(Date), z.string()]).refine((v) => {
      if (!v) return false
      const end = typeof v === 'string' ? new Date(v) : v
      const start =
        typeof startDate.value === 'string' ? new Date(startDate.value) : startDate.value
      return end > (start as Date)
    }, 'End date must be after start date')
  })
)

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
  errors.input = ''
  errors.description = ''
  errors.amount = ''
  errors.customFrequencyDays = ''
  errors.startDate = ''
  errors.endDate = ''

  const result = schema.value.safeParse({
    input: input.value,
    description: description.value,
    amount: amount.value,
    customFrequencyDays: customFrequencyDays.value,
    startDate: startDate.value,
    endDate: endDate.value
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

  emit('approveUser', budgetLimit)
}
</script>

<style>
.dp__input {
  border: none;
}
</style>
