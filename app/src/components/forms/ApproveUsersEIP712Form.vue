<template>
  <UForm :schema="schema" :state="state" class="flex flex-col gap-4" @submit="handleSubmit">
    <!-- BOD Description -->
    <div v-if="isBodAction">
      <p data-test="bod-notification" class="text-sm text-red-500">
        This will create a board of directors action
      </p>
      <UFormField label="Description" name="description" required class="mt-2">
        <UInput
          v-model="state.description"
          placeholder="Enter a description"
          class="w-full"
          data-test="description-input"
        />
      </UFormField>
    </div>

    <!-- Member + Token -->
    <div>
      <SelectMemberWithTokenInput v-model="state.input" />
      <UFormField name="input.address" data-test="address-error" />
      <UFormField name="input.token" />
    </div>

    <!-- Budget Amount -->
    <UFormField label="Budget Amount" name="amount">
      <div class="flex items-center gap-2">
        <UInput
          type="number"
          class="grow"
          data-test="amount-input"
          :model-value="state.amount"
          @update:model-value="(v) => (state.amount = Number(v))"
          placeholder="0.00"
          step="0.01"
          min="0"
        />
        <USelect
          v-model="state.frequencyType"
          :items="frequencyTypes"
          value-key="value"
          data-test="frequency-select"
        />
      </div>
    </UFormField>

    <!-- Custom Frequency -->
    <UFormField
      v-if="state.frequencyType === 4"
      label="Custom Frequency"
      name="customFrequencyDays"
      hint="Period in days (converted to seconds for the contract)"
    >
      <UInput
        type="number"
        class="w-full"
        data-test="custom-frequency-input"
        :model-value="state.customFrequencyDays"
        @update:model-value="(v) => (state.customFrequencyDays = Number(v))"
        placeholder="7"
        min="1"
        step="1"
      />
    </UFormField>

    <!-- Duration -->
    <div class="flex flex-col gap-3">
      <span class="font-semibold">Duration</span>
      <UFormField label="Start Date" name="startDate">
        <VueDatePicker
          v-model="state.startDate"
          :min-date="new Date()"
          auto-apply
          placeholder="Pick start date"
          data-test="start-date-picker"
        />
      </UFormField>

      <UFormField label="End Date" name="endDate">
        <VueDatePicker
          v-model="state.endDate"
          :min-date="state.startDate || new Date()"
          auto-apply
          placeholder="Pick end date"
          data-test="end-date-picker"
        />
      </UFormField>
    </div>

    <!-- Actions -->
    <div class="flex justify-center gap-3 mt-2">
      <UButton
        color="error"
        variant="outline"
        type="button"
        data-test="cancel-button"
        @click="clear"
        label="Cancel"
      />
      <UButton
        type="submit"
        :loading="loadingApprove"
        :disabled="loadingApprove"
        color="primary"
        data-test="approve-button"
        label="Approve"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { isAddress } from 'viem'
import { z } from 'zod'
import type { User } from '@/types'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import SelectMemberWithTokenInput from '@/components/utils/SelectMemberWithTokenInput.vue'

const props = defineProps<{
  loadingApprove: boolean
  isBodAction: boolean
  formData: Array<{ name: string; address: string }>
  users: User[]
}>()

const state = reactive({
  input: { name: '', address: '', token: '' },
  description: '',
  amount: 0,
  frequencyType: 0,
  customFrequencyDays: 7,
  startDate: null as Date | null,
  endDate: null as Date | null
})

const frequencyTypes = [
  { value: 0, label: 'One Time' },
  { value: 1, label: 'Daily' },
  { value: 2, label: 'Weekly' },
  { value: 3, label: 'Monthly' },
  { value: 4, label: 'Custom' }
]

const customFrequencyInSeconds = computed(() => state.customFrequencyDays * 24 * 60 * 60)

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
        (v) => state.frequencyType !== 4 || v >= 1,
        'Custom frequency must be at least 1 day'
      ),
    startDate: z
      .union([z.instanceof(Date), z.null()])
      .refine((v) => v instanceof Date && v > new Date(), 'Start date must be in the future'),
    endDate: z
      .union([z.instanceof(Date), z.null()])
      .refine((v) => {
        if (!(v instanceof Date)) return false
        return !state.startDate || v > state.startDate
      }, 'End date must be after start date')
  })
)

const emit = defineEmits(['closeModal', 'approveUser', 'searchUsers'])

const clear = () => {
  state.input = { name: '', address: '', token: '' }
  state.description = ''
  state.amount = 0
  state.frequencyType = 0
  state.customFrequencyDays = 7
  state.startDate = null
  state.endDate = null
  emit('closeModal')
}

const handleSubmit = () => {
  const budgetLimit = {
    approvedAddress: state.input.address,
    amount: state.amount,
    frequencyType: state.frequencyType,
    customFrequency: state.frequencyType === 4 ? customFrequencyInSeconds.value : 0,
    startDate: state.startDate instanceof Date ? Math.floor(state.startDate.getTime() / 1000) : 0,
    endDate: state.endDate instanceof Date ? Math.floor(state.endDate.getTime() / 1000) : 0,
    tokenAddress: state.input.token
  }

  emit('approveUser', budgetLimit)
}
</script>

<style>
.dp__input {
  border: none;
}
</style>
