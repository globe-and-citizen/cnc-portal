<template>
  <div>
    <h2>Create Proposal</h2>
    <div class="flex flex-col gap-4 mt-2">
      <select
        class="select select-primary w-full"
        v-model="newProposalInput.isElection"
        data-test="electionDiv"
      >
        <option disabled selected>Type of Proposal</option>
        <option :value="true">Election</option>
        <option :value="false">Directive</option>
      </select>
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
        <div class="input-group" ref="formRef">
          <label class="input input-primary flex items-center gap-2 input-md">
            <input
              type="text"
              class="w-28"
              v-model="searchUserName"
              @keyup.stop="
                () => {
                  searchUsers('name')
                  showDropdown = true
                }
              "
              placeholder="Candidate Name"
              data-test="candidateNameInput"
            />
            |
            <input
              type="text"
              class="grow"
              v-model="searchUserAddress"
              @keyup.stop="
                () => {
                  searchUsers('address')
                  showDropdown = true
                }
              "
              placeholder="Address"
              data-test="candidateAddressInput"
            />
          </label>
        </div>

        <div
          class="dropdown"
          v-if="showDropdown"
          :class="{ 'dropdown-open': users && users.users && users.users.length > 0 }"
        >
          <ul
            v-if="users && users.users && users.users.length > 0"
            class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96"
            data-test="candidateDropdown"
          >
            <li v-for="user in users.users" :key="user.address">
              <a
                data-test="dropdown-item"
                @click="
                  () => {
                    newProposalInput.candidates?.push({
                      name: user.name,
                      candidateAddress: user.address
                    })
                    searchUserName = ''
                    searchUserAddress = ''
                    showDropdown = false
                  }
                "
              >
                {{ user.name }} | {{ user.address }}
              </a>
            </li>
          </ul>
        </div>
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
          @click="submitForm"
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

const emits = defineEmits(['createProposal'])
const props = defineProps<{
  isLoading: boolean
  team: Partial<Team>
}>()

const searchUserName = ref('')
const searchUserAddress = ref('')
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
    isElection: false,
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

const users = ref<{ users: User[] }>({ users: [] })

const lastUpdatedInput = ref<'name' | 'address'>('name')

const searchUsers = async (field: 'name' | 'address') => {
  lastUpdatedInput.value = field
  const members = props.team.members
  if (!members) return

  users.value = {
    users: members.filter((member) => {
      if (lastUpdatedInput.value === 'name' && searchUserName.value) {
        return member.name.toLowerCase().includes(searchUserName.value.toLowerCase())
      } else if (lastUpdatedInput.value === 'address' && searchUserAddress.value) {
        return member.address.toLowerCase().includes(searchUserAddress.value.toLowerCase())
      }
      return false
    })
  }
}
const submitForm = () => {
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
