<template>
  <div class="flex min-h-screen justify-center">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>

    <div v-if="!teamIsFetching && team" class="pt-10 flex flex-col gap-5 w-full items-center">
      <TeamMeta :team="team" @getTeam="getTeamAPI" />

      <button
        class="btn btn-primary btn-xs"
        @click="officerModal = true"
        v-if="team.ownerAddress == useUserDataStore().address"
        data-test="manageOfficer"
      >
        Manage Deployments
      </button>
      <ModalComponent v-model="officerModal">
        <OfficerForm
          :team="team"
          @getTeam="
            () => {
              officerModal = false
              getTeamAPI()
            }
          "
        />
      </ModalComponent>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

// Store imports
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'

// Composables
import { useCustomFetch } from '@/composables/useCustomFetch'

// Modals/Forms
import OfficerForm from '@/components/forms/OfficerForm.vue'

//Components
import TeamSection from '@/components/sections/SingleTeamView/MemberSection.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import BankTransactionsSection from '@/components/sections/SingleTeamView/BankTransactionsSection.vue'
import BankSection from '@/components/sections/SingleTeamView/BankSection.vue'
import ProposalSection from '@/components/sections/SingleTeamView/ProposalSection.vue'
import ExpenseAccountSection from '@/components/sections/SingleTeamView/ExpenseAccountSection.vue'
import BoardOfDirectorsSection from '@/components/sections/SingleTeamView/BoardOfDirectorsSection.vue'

import { type User, SingleTeamTabs } from '@/types'
import TeamMeta from '@/components/sections/SingleTeamView/TeamMetaSection.vue'

// Modal control states
const tabs = ref<Array<SingleTeamTabs>>([SingleTeamTabs.Members])
const isOwner = ref(false)
const officerModal = ref(false)

// CRUD input refs
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')

const activeTab = ref(0)

const route = useRoute()

const { addErrorToast } = useToastStore()

// Banking composables

// useFetch instance for getting team details
const {
  error: getTeamError,
  data: team,
  isFetching: teamIsFetching,
  execute: getTeamAPI
} = useCustomFetch(`teams/${String(route.params.id)}`, {
  immediate: false
})
  .get()
  .json()

// Watchers for getting team details
watch(team, () => {
  if (team.value) {
    if (team.value.ownerAddress == useUserDataStore().address) {
      isOwner.value = true
    }
    setTabs()
  }
})
watch(getTeamError, () => {
  if (getTeamError.value) {
    console.error(getTeamError.value)
    addErrorToast(getTeamError.value)
  }
})

onMounted(async () => {
  await getTeamAPI() //Call the execute function to get team details on mount
  if (team?.value?.ownerAddress == useUserDataStore().address) {
    isOwner.value = true
  }
  setTabs()
})

const {
  // execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch('user/search', {
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

watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})
const setTabs = () => {
  if (team?.value?.bankAddress && tabs.value.findIndex((tab) => tab == SingleTeamTabs.Bank) == -1) {
    tabs.value.push(SingleTeamTabs.Bank, SingleTeamTabs.Transactions)
  }

  if (
    team?.value?.votingAddress &&
    tabs.value.findIndex((tab) => tab == SingleTeamTabs.Proposals) == -1
  ) {
    tabs.value.push(SingleTeamTabs.Proposals)
  }

  if (
    team?.value?.expenseAccountAddress &&
    tabs.value.findIndex((tab) => tab == SingleTeamTabs.Expenses) == -1
  ) {
    tabs.value.push(SingleTeamTabs.Expenses)
  }

  if (
    team?.value?.boardOfDirectorsAddress &&
    tabs.value.findIndex((tab) => tab == SingleTeamTabs.BoardOfDirectors) == -1
  ) {
    tabs.value.push(SingleTeamTabs.BoardOfDirectors)
  }
}
</script>
