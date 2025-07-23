<template>
  <div>
    <h2>Create Election</h2>
    <div class="flex flex-col gap-4 mt-2">
      <input
        type="text"
        placeholder="Title"
        class="input input-primary w-full"
        v-model="newProposalInput.title"
        data-test="titleInput"
      />
      <div
        class="pl-4 text-red-500 text-sm w-full text-left"
        v-for="error of $v.proposal.title.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
      </div>

      <textarea
        class="textarea textarea-primary h-24"
        placeholder="Description"
        v-model="newProposalInput.description"
        data-test="descriptionInput"
      ></textarea>
      <div
        class="pl-4 text-red-500 text-sm w-full text-left"
        v-for="error of $v.proposal.description.$errors"
        :key="error.$uid"
      >
        {{ error.$message }}
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

        <div class="mb-4">
          <label class="input input-bordered flex items-center gap-2 input-md mt-2">
            <span class="w-24">Start Date</span>
            <div class="grow" data-test="date-picker">
              <VueDatePicker
                v-model="newProposalInput.startDate"
                :min-date="new Date()"
                auto-apply
              />
            </div>
          </label>
        </div>

        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-for="error of $v.proposal.startDate.$errors"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>

        <div class="mb-4">
          <label class="input input-bordered flex items-center gap-2 input-md mt-2">
            <span class="w-24">End Date</span>
            <div class="grow" data-test="date-picker">
              <VueDatePicker v-model="newProposalInput.endDate" :min-date="new Date()" auto-apply />
            </div>
          </label>
        </div>

        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-for="error of $v.proposal.endDate.$errors"
          :key="error.$uid"
        >
          {{ error.$message }}
        </div>

        <MultiSelectMemberInput v-model="formData" />

        <div
          class="pl-4 text-red-500 text-sm w-full text-left"
          v-if="newProposalInput.isElection && $v.proposal.candidates.$error"
        >
          {{ $v.proposal.candidates.$errors[0]?.$message }}
        </div>
      </div>

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
import { required, minLength, requiredIf, helpers } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '@/components/ButtonUI.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'
import VueDatePicker from '@vuepic/vue-datepicker'

const emits = defineEmits(['createProposal'])
defineProps<{ isLoading: boolean }>()

const formData = ref<Array<Pick<User, 'address' | 'name'>>>([])
interface Candidate {
  name: string
  candidateAddress: string
}
const uniqueCandidates = () => {
  return {
    $validator: (candidates: Candidate[]) => {
      if (!Array.isArray(candidates) || candidates.length === 0) return true
      const addresses = candidates.map((c) => c.candidateAddress)
      const uniqueAddresses = new Set(addresses)
      return addresses.length === uniqueAddresses.size
    },
    $message: 'Duplicate candidates are not allowed.'
  }
}

const newProposalInput = ref<Partial<OldProposal>>({
  title: '',
  description: '',
  startDate: '',
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

const rules = {
  proposal: {
    title: {
      required,
      minLength: minLength(3)
    },
    description: {
      required,
      minLength: minLength(10)
    },
    candidates: {
      requiredIf: requiredIf(() => newProposalInput.value?.isElection ?? false),
      uniqueCandidates: uniqueCandidates()
    },
    startDate: {
      required,
      beforeEnd: helpers.withMessage('Start date must be before end date: ', (value) => {
        return (value as Date) < (newProposalInput.value?.endDate as Date)
      })
    },
    endDate: {
      required,
      afterStart: helpers.withMessage('End date must be later than start date: ', (value) => {
        return (value as Date) > (newProposalInput.value?.startDate as Date)
      })
    }
  }
}
const $v = useVuelidate(rules, { proposal: newProposalInput })

const submitForm = () => {
  newProposalInput.value.candidates = []
  for (const user of formData.value) {
    newProposalInput.value.candidates?.push({
      name: user.name || '',
      candidateAddress: user.address || ''
    })
  }
  console.log('newProposalInput: ', newProposalInput.value)
  $v.value.$touch()
  if ($v.value.$invalid) return
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
