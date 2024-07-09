<template>
  <div>
    <h2>Create Proposal</h2>
    <div class="flex flex-col gap-4 mt-2">
      <select class="select select-primary w-full" v-model="newProposalInput.isElection">
        <option disabled selected>Type of Proposal</option>
        <option :value="true">Election</option>
        <option :value="false">Directive</option>
      </select>
      <input
        type="text"
        placeholder="Title"
        class="input input-primary w-full"
        v-model="newProposalInput.title"
      />

      <textarea
        class="textarea textarea-primary h-24"
        placeholder="Description"
        v-model="newProposalInput.description"
      ></textarea>
      <div v-if="newProposalInput.isElection">
        <div class="input-group">
          <label class="input input-primary flex items-center gap-2 input-md">
            <input
              type="text"
              class="w-28"
              v-model="searchUserName"
              @keyup.stop="
                () => {
                  searchUsers()
                  dropdown = true
                }
              "
              placeholder="Candidate Name"
            />
            |
            <input
              type="text"
              class="grow"
              v-model="searchUserAddress"
              @keyup.stop="
                () => {
                  searchUsers()
                  dropdown = true
                }
              "
              placeholder="Address"
            />
          </label>
        </div>

        <div
          class="dropdown"
          v-if="dropdown"
          :class="{ 'dropdown-open': users && users.users && users.users.length > 0 }"
        >
          <ul
            v-if="users && users.users && users.users.length > 0"
            class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-96"
          >
            <li v-for="user in users.users" :key="user.address">
              <a
                @click="
                  () => {
                    newProposalInput.candidates.push({
                      name: user.name,
                      candidateAddress: user.address
                    })
                    searchUserName = ''
                    searchUserAddress = ''
                    dropdown = false
                  }
                "
              >
                {{ user.name }} | {{ user.address }}
              </a>
            </li>
          </ul>
        </div>
        <div
          class="flex m-4 text-sm gap-4 justify-between"
          v-for="(candidate, index) in newProposalInput.candidates"
          :key="index"
        >
          <span>
            {{ candidate.name }}
          </span>
          <span>
            {{ candidate.candidateAddress }}
          </span>
          <MinusCircleIcon
            class="w-4 cursor-pointer"
            @click="() => newProposalInput.candidates.splice(index, 1)"
          />
        </div>
      </div>

      <div class="flex justify-center">
        <LoadingButton v-if="isLoading" color="primary min-w-28" />

        <button
          v-else
          class="btn btn-primary btn-md justify-center"
          @click="emits('createProposal')"
        >
          Create Proposal
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoadingButton from '../LoadingButton.vue'
import { ref } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useErrorHandler } from '@/composables/errorHandler'
import { MinusCircleIcon } from '@heroicons/vue/24/solid'

const emits = defineEmits(['createProposal'])
defineProps<{
  isLoading: boolean
}>()
const dropdown = ref<boolean>(true)

const searchUserName = ref('')
const searchUserAddress = ref('')

const newProposalInput = defineModel({
  default: {
    title: '',
    description: '',
    candidates: [
      {
        name: '',
        candidateAddress: ''
      }
    ],
    isElection: false
  }
})
const { execute: executeSearchUser, data: users } = useCustomFetch('user/search', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    const params = new URLSearchParams()
    if (!searchUserName.value && !searchUserAddress.value) return
    if (searchUserName.value) params.append('name', searchUserName.value)
    if (searchUserAddress.value) params.append('address', searchUserAddress.value)
    url += '?' + params.toString()
    return { options, url, cancel }
  }
})
  .get()
  .json()
const searchUsers = async () => {
  try {
    if (searchUserName.value || searchUserAddress.value) {
      await executeSearchUser()
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
}
</script>
