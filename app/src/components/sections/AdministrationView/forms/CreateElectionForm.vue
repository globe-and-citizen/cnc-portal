<template>
  <div>
    <h2>Create Election</h2>
    <div class="flex flex-col gap-4 mt-2">
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Title</span>
        </div>

        <input
          type="text"
          placeholder="Title"
          class="input input-primary w-full"
          v-model="newProposalInput.title"
          data-test="titleInput"
        />
        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-if="errors.title"
        >
          {{ errors.title }}
        </div>
      </label>

      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Description</span>
        </div>

        <textarea
          class="textarea textarea-primary h-24 w-full"
          placeholder="Description"
          v-model="newProposalInput.description"
          data-test="descriptionInput"
        ></textarea>
        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-if="errors.description"
        >
          {{ errors.description }}
        </div>
      </label>

      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Number of Board Of Directors</span>
        </div>

        <div v-if="newProposalInput.isElection">
          <div class="mb-4">
            <input
              type="number"
              class="input input-primary w-full"
              placeholder="Number of Directors"
              v-model="newProposalInput.winnerCount"
              data-test="winnerCountInput"
            />
          </div>
          <div
            class="pl-4 text-red-500 text-sm w-full text-left"
            v-if="errors.winnerCount"
          >
            {{ errors.winnerCount }}
          </div>

          <div class="mb-4">
            <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
              <span class="w-24">Start Date</span>
              <div class="grow" data-test="date-picker">
                <VueDatePicker
                  v-model="newProposalInput.startDate"
                  :min-date="startDate"
                  auto-apply
                />
              </div>
            </label>
          </div>

          <div
            class="pl-4 text-red-500 text-sm w-full text-left"
            v-if="errors.startDate"
          >
            {{ errors.startDate }}
          </div>

          <div class="mb-4">
            <label class="w-full input input-bordered flex items-center gap-2 input-md mt-2">
              <span class="w-24">End Date</span>
              <div class="grow" data-test="date-picker">
                <VueDatePicker
                  v-model="newProposalInput.endDate"
                  :min-date="new Date()"
                  auto-apply
                />
              </div>
            </label>
          </div>

          <div
            class="pl-4 text-red-500 text-sm w-full text-left"
            v-if="errors.endDate"
          >
            {{ errors.endDate }}
          </div>

          <MultiSelectMemberInput
            v-model="formData"
            :show-on-focus="true"
            :only-team-members="true"
          />

          <div
            class="pl-4 text-red-500 text-sm w-full text-left"
            v-if="newProposalInput.isElection && errors.candidates"
          >
            {{ errors.candidates }}
          </div>
        </div>
      </label>

      <div class="flex justify-center">
        <ButtonUI
          :loading="isLoading"
          :disabled="isLoading"
          class="btn btn-primary btn-md justify-center"
          data-test="submitButton"
          @click="submitForm"
        >
          Create Election
        </ButtonUI>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OldProposal, User } from '@/types'
import { ref, onMounted, onUnmounted } from 'vue'
import { z } from 'zod'
import ButtonUI from '@/components/ButtonUI.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import VueDatePicker from '@vuepic/vue-datepicker'

// Dev = 2 minutes, Prod = 1 hour
const delay = 2 * 60 * 1000
const startDate = new Date(new Date().getTime() + delay)

const emits = defineEmits(['createProposal'])
defineProps<{ isLoading: boolean }>()

const formData = ref<Array<Pick<User, 'address' | 'name'>>>([])
const electionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  candidates: z.array(z.object({
    name: z.string(),
    candidateAddress: z.string()
  })).refine((candidates) => {
    if (!Array.isArray(candidates) || candidates.length === 0) return true
    const addresses = candidates.map((c) => c.candidateAddress)
    return new Set(addresses).size === addresses.length
  }, { message: 'Duplicate candidates are not allowed.' }),
  startDate: z.any().refine((val) => val !== null && val !== undefined && val !== '', {
    message: 'Start date is required'
  }),
  endDate: z.any().refine((val) => val !== null && val !== undefined && val !== '', {
    message: 'End date is required'
  }),
  winnerCount: z.coerce.number().min(3, 'Must be at least 3').refine(
    (val) => val % 2 === 1,
    { message: 'Number of directors must be an odd number' }
  )
}).refine((data) => {
  return (data.startDate as Date) < (data.endDate as Date)
}, { message: 'Start date must be before end date', path: ['startDate'] }).refine((data) => {
  return (data.endDate as Date) > (data.startDate as Date)
}, { message: 'End date must be later than start date', path: ['endDate'] })

const errors = ref<Record<string, string>>({})

function validate() {
  const result = electionSchema.safeParse(newProposalInput.value)
  errors.value = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string
      if (key && !errors.value[key]) {
        errors.value[key] = issue.message
      }
    }
    return false
  }
  return true
}

const newProposalInput = ref<Partial<OldProposal>>({
  title: '',
  description: '',
  startDate,
  endDate: '',
  candidates: [
    {
      name: '',
      candidateAddress: ''
    }
  ],
  isElection: true,
  winnerCount: 0
})

const submitForm = () => {
  newProposalInput.value.candidates = []
  for (const user of formData.value) {
    newProposalInput.value.candidates?.push({
      name: user.name || '',
      candidateAddress: user.address || ''
    })
  }
  if (!validate()) return
  emits('createProposal', newProposalInput.value)
}

const formRef = ref<HTMLElement | null>(null)
const showDropdown = ref<boolean>(false)

const handleClickOutside = (event: MouseEvent) => {
  if (formRef.value && !formRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
