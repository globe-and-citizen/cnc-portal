<template>
  <h3 class="font-bold text-xl">Create New Proposal</h3>
  <UForm :schema="schema" :state="state" @submit="handleSubmit" class="flex flex-col w-full gap-2">
    <UFormField name="title" label="Title">
      <UInput v-model="state.title" placeholder="Enter proposal title" class="w-full" />
    </UFormField>

    <UFormField name="description" label="Description">
      <UTextarea
        v-model="state.description"
        placeholder="Describe your proposal..."
        class="w-full"
        :rows="4"
      />
    </UFormField>

    <UFormField name="type" label="Type">
      <USelect
        v-model="state.type"
        :items="types"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>

    <div class="flex flex-row justify-between items-start gap-4">
      <UFormField name="startDate" label="Start Date" class="flex-1">
        <VueDatePicker
          v-model="state.startDate"
          placeholder="mm/dd/yyyy"
          :min-date="new Date()"
          auto-apply
          :enable-time-picker="false"
        />
      </UFormField>
      <UFormField name="endDate" label="End Date" class="flex-1">
        <VueDatePicker
          v-model="state.endDate"
          placeholder="mm/dd/yyyy"
          :min-date="state.startDate || new Date()"
          auto-apply
          :enable-time-picker="false"
        />
      </UFormField>
    </div>

    <div class="modal-action">
      <UButton color="error" variant="outline" @click="emit('closeModal')" label="Cancel" />
      <UButton
        type="submit"
        color="primary"
        :loading="isCreatingProposal || isConfirmingProposal"
        :disabled="isCreatingProposal || isConfirmingProposal"
        data-test="create-proposal-button"
        label="Create Proposal"
      />
    </div>
  </UForm>
</template>

<script setup lang="ts">
import VueDatePicker from '@vuepic/vue-datepicker'
import { reactive, computed, watch } from 'vue'
import { z } from 'zod'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
import { type Address } from 'viem'

const emit = defineEmits(['closeModal', 'proposal-created'])

const teamStore = useTeamStore()
const toast = useToast()

const state = reactive({
  title: '',
  description: '',
  type: 'Financial' as 'Financial' | 'Technical' | 'Operational',
  startDate: null as Date | null,
  endDate: null as Date | null
})

const types = [
  { label: 'Financial', value: 'Financial' },
  { label: 'Technical', value: 'Technical' },
  { label: 'Operational', value: 'Operational' }
]

const proposalsAddress = computed(() => teamStore.getContractAddressByType('Proposals') as Address)

const schema = computed(() =>
  z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must be less than 100 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(1000, 'Description must be less than 1000 characters'),
    type: z.enum(['Financial', 'Technical', 'Operational']),
    startDate: z
      .instanceof(Date)
      .nullable()
      .refine((v) => v !== null, 'Start date is required'),
    endDate: z
      .instanceof(Date)
      .nullable()
      .refine((v) => v !== null, 'End date is required')
      .refine(
        (v) => !v || !state.startDate || v > state.startDate,
        'End date must be after start date'
      )
  })
)

const {
  mutate: createProposal,
  isPending: isCreatingProposal,
  error: createError,
  data: txHash
} = useWriteContract()

const {
  isLoading: isConfirmingProposal,
  isSuccess: isProposalCreated,
  error: errorConfirmingProposal
} = useWaitForTransactionReceipt({ hash: txHash })

const dateToTimestamp = (date: Date): number => Math.floor(date.getTime() / 1000)

const handleSubmit = async () => {
  try {
    createProposal({
      address: proposalsAddress.value,
      abi: PROPOSALS_ABI,
      functionName: 'createProposal',
      args: [
        state.title,
        state.description,
        state.type,
        BigInt(dateToTimestamp(state.startDate!)),
        BigInt(dateToTimestamp(state.endDate!))
      ]
    })
  } catch (error) {
    console.error('Error creating proposal:', error)
    toast.add({ title: 'Failed to create proposal', color: 'error' })
  }
}

watch(isProposalCreated, (success) => {
  if (success) {
    toast.add({ title: 'Proposal created successfully!', color: 'success' })
    emit('proposal-created')
  }
})

watch(createError, (error) => {
  if (!error) return
  console.error(error)
})

watch(errorConfirmingProposal, (error) => {
  if (!error) return
  toast.add({ title: 'Failed to confirm proposal creation', color: 'error' })
})
</script>
