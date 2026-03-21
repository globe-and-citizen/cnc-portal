<template>
  <UForm :schema="proposalSchema" :state="state" class="flex flex-col w-full" @submit="handleSubmit">
    <h3 class="font-bold text-xl">Create New Proposal</h3>

    <UFormField label="Title" name="title" required class="w-full mt-2">
      <UInput
        v-model="state.title"
        placeholder="Enter proposal title"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Description" name="description" required class="w-full mt-2">
      <UTextarea
        v-model="state.description"
        placeholder="Describe your proposal..."
        :rows="4"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Type" name="type" required class="w-full mt-2">
      <USelect
        v-model="state.type"
        :items="types"
      />
    </UFormField>

    <div class="flex flex-row justify-between items-center gap-4 mt-2">
      <UFormField label="Start Date" name="startDate" required class="flex-1">
        <div class="border rounded-lg p-2 bg-white shadow-xs">
          <VueDatePicker
            v-model="state.startDate"
            placeholder="mm/dd/yyyy"
            :min-date="new Date()"
            auto-apply
            :enable-time-picker="false"
          />
        </div>
      </UFormField>

      <UFormField label="End Date" name="endDate" required class="flex-1">
        <div class="border rounded-lg p-2 bg-white shadow-xs">
          <VueDatePicker
            v-model="state.endDate"
            placeholder="mm/dd/yyyy"
            :min-date="state.startDate || new Date()"
            auto-apply
            :enable-time-picker="false"
          />
        </div>
      </UFormField>
    </div>

    <div class="modal-action">
      <UButton
        color="error"
        variant="outline"
        @click="emit('closeModal')"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        color="primary"
        :loading="isCreatingProposal || isConfirmingProposal"
        :disabled="isCreatingProposal || isConfirmingProposal"
        data-test="create-proposal-button"
      >
        Create Proposal
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import VueDatePicker from '@vuepic/vue-datepicker'
import { ref, computed, watch } from 'vue'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
import { useToastStore } from '@/stores/useToastStore'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
import { type Address } from 'viem'
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

// Props and emits
const emit = defineEmits(['closeModal', 'proposal-created'])

// Stores
const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

// Form data
const state = ref({
  title: undefined as string | undefined,
  description: undefined as string | undefined,
  type: 'Financial' as 'Financial' | 'Technical' | 'Operational',
  startDate: undefined as Date | undefined,
  endDate: undefined as Date | undefined
})

// Proposal types
const types = [
  { label: 'Financial', value: 'Financial' },
  { label: 'Technical', value: 'Technical' },
  { label: 'Operational', value: 'Operational' }
]

// Get the Proposals contract address from the team store
const proposalsAddress = computed(() => teamStore.getContractAddressByType('Proposals') as Address)

// Zod validation schema
const proposalSchema = z.object({
  title: z.string({ message: 'Title is required' }).min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string({ message: 'Description is required' }).min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  type: z.string({ message: 'Type is required' }).min(1, 'Type is required'),
  startDate: z.date({ message: 'Start date is required' }),
  endDate: z.date({ message: 'End date is required' })
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
})

type ProposalSchema = z.output<typeof proposalSchema>

// Contract interaction
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
} = useWaitForTransactionReceipt({
  hash: txHash
})

// Convert Date to Unix timestamp
const dateToTimestamp = (date: Date): number => {
  return Math.floor(date.getTime() / 1000)
}

// Handle form submission
const handleSubmit = async (event: FormSubmitEvent<ProposalSchema>) => {
  try {
    const startTimestamp = dateToTimestamp(event.data.startDate)
    const endTimestamp = dateToTimestamp(event.data.endDate)

    createProposal({
      address: proposalsAddress.value,
      abi: PROPOSALS_ABI,
      functionName: 'createProposal',
      args: [
        event.data.title,
        event.data.description,
        event.data.type,
        BigInt(startTimestamp),
        BigInt(endTimestamp)
      ]
    })
  } catch (error) {
    console.error('Error creating proposal:', error)
    addErrorToast('Failed to create proposal')
  }
}

// Watch for successful proposal creation
watch(isProposalCreated, (success) => {
  if (success) {
    addSuccessToast('Proposal created successfully!')
    emit('proposal-created')
  }
})

// Watch for errors
watch(createError, (error) => {
  if (!error) return
  console.error(error)
})
watch(errorConfirmingProposal, (error) => {
  if (!error) return

  addErrorToast('Failed to confirm proposal creation')
})
</script>
