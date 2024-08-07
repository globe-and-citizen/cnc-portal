<template>
  <div class="flex min-h-screen justify-center">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>

    <div v-if="!teamIsFetching && team" class="pt-10 flex flex-col gap-5 w-full items-center">
      <TeamMeta :team="team" @getTeam="getTeamAPI" />
      <button
        class="btn btn-primary btn-xs"
        @click="bankModal = true"
        v-if="!team.bankAddress && team.ownerAddress == useUserDataStore().address"
        data-test="createBank"
      >
        Create Bank Account
      </button>
      <TabNavigation v-model="activeTab" :tabs="tabs" class="w-full">
        <template #tab-0>
          <div id="members" v-if="activeTab == 0">
            <TeamSection :team="team" :teamIsFetching="teamIsFetching" @getTeam="getTeamAPI" />
          </div>
        </template>
        <template #tab-1>
          <TeamAccount
            v-if="activeTab == 1"
            :team="team"
            @createBank="bankModal = true"
            :foundUsers="foundUsers"
            @searchUsers="
              (input) => {
                console.log(input)
                searchUsers({ name: '', address: input })
              }
            "
          />
        </template>
        <template #tab-2>
          <BankTransactions v-if="activeTab == 2" :bank-address="team.bankAddress" />
        </template>
        <template #tab-3>
          <ProposalDashBoard :team="team" @getTeam="getTeamAPI" />
        </template>
      </TabNavigation>
    </div>

    <ModalComponent v-model="bankModal">
      <CreateBankForm
        @create-bank="async () => deployBankContract()"
        :loading="createBankLoading"
      />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

// Store imports
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'

// Composables
import { useErrorHandler } from '@/composables/errorHandler'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useDeployBankContract } from '@/composables/bank'

// Service
// import { AuthService } from '@/services/authService'

// Modals/Forms
import CreateBankForm from '@/components/forms/CreateBankForm.vue'

//Components
import TeamSection from '@/components/sections/SingleTeamView/MemberSection.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import BankTransactions from '@/components/BankTransactions.vue'
import TeamAccount from '@/components/sections/SingleTeamView/TeamAccount.vue'
import ProposalDashBoard from '@/components/sections/SingleTeamView/ProposalSection.vue'

import { type User, SingleTeamTabs } from '@/types'
import TeamMeta from '@/components/sections/SingleTeamView/TeamMetaSection.vue'

// Modal control states
const bankModal = ref(false)
const tabs = ref<Array<SingleTeamTabs>>([SingleTeamTabs.Members])
const isOwner = ref(false)

// CRUD input refs
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')

const activeTab = ref(0)

const route = useRoute()

const { addSuccessToast, addErrorToast } = useToastStore()

// Banking composables

const {
  contractAddress,
  execute: createBankContract,
  isLoading: createBankLoading,
  isSuccess: createBankSuccess,
  error: createBankError
} = useDeployBankContract()

// Watchers for Banking functions

watch(createBankError, () => {
  if (createBankError.value) {
    addErrorToast('Failed to create bank contract')
  }
})
watch(createBankSuccess, async () => {
  if (createBankSuccess.value) {
    addSuccessToast('Bank contract created successfully')
    bankModal.value = false
    await getTeamAPI()
  }
})

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
watch(getTeamError, () => {
  if (getTeamError.value) {
    useErrorHandler().handleError(new Error(getTeamError.value))
  }
})

onMounted(async () => {
  await getTeamAPI() //Call the execute function to get team details on mount

  if (team.value.ownerAddress == useUserDataStore().address) {
    isOwner.value = true
  }
  if (team.value.bankAddress) {
    tabs.value.push(SingleTeamTabs.Bank, SingleTeamTabs.Transactions, SingleTeamTabs.Proposals)
  }
})

const deployBankContract = async () => {
  const id = route.params.id
  await createBankContract(String(id))
  team.value.bankAddress = contractAddress.value
  if (team.value.bankAddress) {
    bankModal.value = false
    tabs.value.push(SingleTeamTabs.Bank, SingleTeamTabs.Transactions, SingleTeamTabs.Proposals)
    await getTeamAPI()
  }
}

const {
  execute: executeSearchUser,
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
const searchUsers = async (input: { name: string; address: string }) => {
  try {
    searchUserName.value = input.name
    searchUserAddress.value = input.address
    if (searchUserName.value || searchUserAddress.value) {
      await executeSearchUser()
    }
  } catch (error) {
    return useErrorHandler().handleError(error)
  }
}
</script>
