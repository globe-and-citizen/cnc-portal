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

        <MultiSelectMemberInput v-model="formData" />

        <div
          class="flex m-4 text-xs gap-4 justify-between"
          v-for="(candidate, index) in newProposalInput.candidates"
          :key="index"
          data-test="candidate-item"
        >
          <span>
            {{ candidate.name }}
          </span>
          <span>
            {{ candidate.candidateAddress }}
          </span>
          <IconifyIcon
            icon="heroicons:user-plus"
            class="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors duration-200 cursor-pointer"
            data-test="remove-candidate"
            @click="() => newProposalInput.candidates?.splice(index, 1)"
          />
        </div>
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
          @click="
            () => {
              submitForm()
            }
          "
        >
          Create Proposal
        </ButtonUI>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Proposal, Team } from '@/types/index'
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { required, minLength, requiredIf } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import ButtonUI from '@/components/ButtonUI.vue'
import MultiSelectMemberInput from '@/components/utils/MultiSelectMemberInput.vue'

const emits = defineEmits(['createProposal'])
const props = defineProps<{
  isLoading: boolean
  team: Partial<Team>
}>()

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

const newProposalInput = defineModel<Partial<Proposal>>({
  default: {
    title: '',
    description: '',
    candidates: [
      {
        name: '',
        candidateAddress: ''
      }
    ],
    isElection: true,
    winnerCount: 0
  }
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
    }
  }
}
const $v = useVuelidate(rules, { proposal: newProposalInput })

interface User {
  name: string
  address: string
}

const submitForm = () => {
  for (const user of formData.value) {
    newProposalInput.value.candidates?.push({
      name: user.name,
      candidateAddress: user.address
    })
  }

  $v.value.$touch()
  if ($v.value.$invalid) return
  emits('createProposal')
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
