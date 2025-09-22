<template>
  <h3 class="font-bold text-xl">Create New Proposal</h3>
  <div class="flex flex-col w-full">
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Title</span></div>
      <input
        type="text"
        placeholder="Enter proposal title"
        v-model="proposal.title"
        class="input input-bordered w-full"
        :class="{ 'input-error': $v.title.$error }"
      />
      <div v-if="$v.title.$error" class="label">
        <span class="label-text-alt text-error">{{ $v.title.$errors[0]?.$message }}</span>
      </div>
    </label>

    <label class="form-control">
      <div class="label">
        <span class="label-text">Description</span>
      </div>
      <textarea
        class="textarea textarea-bordered h-24"
        placeholder="Describe your proposal..."
        v-model="proposal.description"
        :class="{ 'textarea-error': $v.description.$error }"
      ></textarea>
      <div v-if="$v.description.$error" class="label">
        <span class="label-text-alt text-error">{{ $v.description.$errors[0]?.$message }}</span>
      </div>
    </label>

    <label class="form-control w-full">
      <div class="label">
        <span class="label-text">Type</span>
      </div>
      <select
        class="select select-bordered"
        :class="{ 'select-error': $v.type.$error }"
        v-model="proposal.type"
      >
        <option
          v-for="type in types"
          :key="type.value"
          :value="type.value"
          :selected="type.value === proposal.type"
        >
          {{ type.label }}
        </option>
      </select>
      <div v-if="$v.type.$error" class="label">
        <span class="label-text-alt text-error">{{ $v.type.$errors[0]?.$message }}</span>
      </div>
    </label>

    <div class="flex flex-row justify-between items-center gap-4">
      <div class="flex flex-col flex-1">
        <label class="label">
          <span class="label-text">Start Date</span>
        </label>
        <div
          class="border rounded-lg p-2 bg-white shadow-sm"
          :class="{ 'border-error': $v.startDate.$error }"
        >
          <VueDatePicker
            v-model="proposal.startDate"
            placeholder="mm/dd/yyyy"
            :min-date="new Date()"
            auto-apply
            :enable-time-picker="false"
          />
        </div>
        <div v-if="$v.startDate.$error" class="label">
          <span class="label-text-alt text-error">{{ $v.startDate.$errors[0]?.$message }}</span>
        </div>
      </div>
      <div class="flex flex-col flex-1">
        <label class="label">
          <span class="label-text">End Date</span>
        </label>
        <div
          class="border rounded-lg p-2 bg-white shadow-sm"
          :class="{ 'border-error': $v.endDate.$error }"
        >
          <VueDatePicker
            v-model="proposal.endDate"
            placeholder="mm/dd/yyyy"
            :min-date="proposal.startDate || new Date()"
            auto-apply
            :enable-time-picker="false"
          />
        </div>
        <div v-if="$v.endDate.$error" class="label">
          <span class="label-text-alt text-error">{{ $v.endDate.$errors[0]?.$message }}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-action">
    <ButtonUI
      variant="error"
      outline
      @click="
        () => {
          reset()
          emit('closeModal')
        }
      "
      >Cancel</ButtonUI
    >
    <ButtonUI
      variant="primary"
      @click="handleSubmit"
      :loading="isCreatingProposal || isConfirmingProposal"
      :disabled="isCreatingProposal || isConfirmingProposal"
      data-test="create-proposal-button"
    >
      Create Proposal
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import { ref, computed, watch } from 'vue'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
import { useToastStore } from '@/stores/useToastStore'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
import { type Address } from 'viem'
import { required, minLength, maxLength, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

// Props and emits
const emit = defineEmits(['closeModal', 'proposal-created'])

// Stores
const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

// Form data
const proposal = ref({
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

// Custom validators
const afterStartDate = (value: Date | undefined) => {
  if (!value || !proposal.value.startDate) return false
  return value > proposal.value.startDate
}

function reset() {
  proposal.value = {
    title: undefined,
    description: undefined,
    type: 'Financial',
    startDate: undefined,
    endDate: undefined
  }
  if ($v.value) {
    $v.value.$reset()
  }
}
defineExpose({ reset })

// Validation rules
const rules = {
  title: {
    required: helpers.withMessage('Title is required', required),
    minLength: helpers.withMessage('Title must be at least 3 characters', minLength(3)),
    maxLength: helpers.withMessage('Title must be less than 100 characters', maxLength(100))
  },
  description: {
    required: helpers.withMessage('Description is required', required),
    minLength: helpers.withMessage('Description must be at least 10 characters', minLength(10)),
    maxLength: helpers.withMessage('Description must be less than 1000 characters', maxLength(1000))
  },
  type: {
    required: helpers.withMessage('Type is required', required)
  },
  startDate: {
    required: helpers.withMessage('Start date is required', required)
  },
  endDate: {
    required: helpers.withMessage('End date is required', required),
    afterStartDate: helpers.withMessage('End date must be after start date', afterStartDate)
  }
}

// Initialize Vuelidate
const $v = useVuelidate(rules, proposal)

// Contract interaction
const {
  writeContract: createProposal,
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
const handleSubmit = async () => {
  // Trigger validation
  $v.value.$touch()

  if ($v.value.$invalid) return

  try {
    const startTimestamp = dateToTimestamp(proposal.value.startDate!)
    const endTimestamp = dateToTimestamp(proposal.value.endDate!)

    createProposal({
      address: proposalsAddress.value,
      abi: PROPOSALS_ABI,
      functionName: 'createProposal',
      args: [
        proposal.value.title!,
        proposal.value.description!,
        proposal.value.type!,
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
