<template>
  <div class="flex min-h-screen justify-center">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>

    <div v-if="!teamIsFetching && team" class="pt-10 flex flex-col gap-5 w-full items-center">
      <TeamMeta :team="team" @getTeam="getTeamAPI" />
      <div class="grid grid-cols-4 gap-2">
        <div>
          <button
            class="btn btn-primary btn-xs"
            @click="bankModal = true"
            v-if="!team.bankAddress && team.ownerAddress == useUserDataStore().address"
            data-test="createBank"
          >
            Create Bank Account
          </button>
        </div>
        <div>
          <button
            class="btn btn-primary btn-xs"
            @click="addCampaignModal = true"
            v-if="!team.addCampaignAddress && team.ownerAddress == useUserDataStore().address"
            data-test="createAddCampaign"
          >
            Deploy advertise contract
          </button>
        </div>
      </div>
      <TabNavigation v-model="activeTab" :tabs="tabs" class="w-full">
        <template #tab-0>
          <div id="members" v-if="activeTab == 0">
            <TeamSection :team="team" :teamIsFetching="teamIsFetching" @getTeam="getTeamAPI" />
          </div>
        </template>
        <template #tab-1>
          <TeamContracts v-if="activeTab == 1" :contracts="team.contracts" />
        </template>
        <template #tab-2>
          <BankSection v-if="activeTab == 2" :team="team" />
        </template>
        <template #tab-3>
          <BankTransactionsSection v-if="activeTab == 3" :bank-address="team.bankAddress" />
        </template>
        <template #tab-4>
          <ProposalSection :team="team" @getTeam="getTeamAPI" />
          <ProposalSection v-if="activeTab == 4" :team="team" @getTeam="getTeamAPI" />
        </template>
        <template #tab-5>
          <ExpenseAccountSection v-if="activeTab == 5" :team="team" />
        </template>
      </TabNavigation>
    </div>

    <ModalComponent v-model="bankModal">
      <CreateBankForm
        @create-bank="async () => deployBankContract()"
        :loading="createBankLoading"
      />
    </ModalComponent>
    <ModalComponent v-model="addCampaignModal">
      <CreateAddCamapaign
        @create-add-campaign="
          async (_costPerClick: number, _costPerImpression: number) =>
            deployAddCampaignContract(_costPerClick, _costPerImpression)
        "
        :loading="createAddCampaignLoading"
        :bankAddress="_teamBankContractAddress"
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
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useDeployBankContract } from '@/composables/bank'
import { useDeployAddCampaignContract } from '@/composables/addCampaign'

// Service
// import { AuthService } from '@/services/authService'

// Modals/Forms
import CreateBankForm from '@/components/forms/CreateBankForm.vue'
import CreateAddCamapaign from '@/components/forms/CreateAddCamapaign.vue'

//Components
import TeamSection from '@/components/sections/SingleTeamView/MemberSection.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import BankTransactionsSection from '@/components/sections/SingleTeamView/BankTransactionsSection.vue'
import TeamContracts from '@/components/TeamContracts.vue'
import BankSection from '@/components/sections/SingleTeamView/BankSection.vue'
import ProposalSection from '@/components/sections/SingleTeamView/ProposalSection.vue'
import ExpenseAccountSection from '@/components/sections/SingleTeamView/ExpenseAccountSection.vue'

import { type User, SingleTeamTabs } from '@/types'
import TeamMeta from '@/components/sections/SingleTeamView/TeamMetaSection.vue'

// Modal control states
const bankModal = ref(false)
const tabs = ref<Array<SingleTeamTabs>>([SingleTeamTabs.Members, SingleTeamTabs.Contracts])
const isOwner = ref(false)
const addCampaignModal = ref(false)

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

const {
  contractAddress: addCampaignContractAddress,
  execute: createAddCampaign,
  isLoading: createAddCampaignLoading
  //isSuccess: CreateAddCamapaignSuccess,
  //error: CreateAddCamapaignError
} = useDeployAddCampaignContract()

const _teamBankContractAddress = ref('')

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
    addErrorToast(getTeamError.value)
  }
})

onMounted(async () => {
  await getTeamAPI() //Call the execute function to get team details on mount

  if (team?.value?.ownerAddress == useUserDataStore().address) {
    isOwner.value = true
  }
  if (team?.value?.bankAddress) {
    tabs.value.push(
      SingleTeamTabs.Bank,
      SingleTeamTabs.Transactions,
      SingleTeamTabs.Proposals,
      SingleTeamTabs.Expenses
    )
  }
  _teamBankContractAddress.value = team.value?.bankAddress
    ? team.value.bankAddress
    : team.value?.ownerAddress
      ? team.value.ownerAddress
      : ''
})

const deployBankContract = async () => {
  const id = route.params.id
  await createBankContract(String(id))
  team.value.bankAddress = contractAddress.value
  if (team.value.bankAddress) {
    bankModal.value = false
    addSuccessToast('Team updated successfully')
    tabs.value.push(
      SingleTeamTabs.Bank,
      SingleTeamTabs.Transactions,
      SingleTeamTabs.Proposals,
      SingleTeamTabs.Expenses
    )
    await getTeamAPI()
  }
}
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

const deployAddCampaignContract = async (_costPerClick: number, _costPerImpression: number) => {
  const id = route.params.id
  // Update the ref values with new data

  await createAddCampaign(
    _teamBankContractAddress.value.toString(),
    _costPerClick,
    _costPerImpression,
    useUserDataStore().address,
    String(id)
  )

  //addCampaignContractAddress.value="0x503b62DA4e895f2659eF342fB39bB1545aBbDe3F"
  //optional default value for contract address
  if (addCampaignContractAddress.value) {
    addCampaignModal.value = false
    await getTeamAPI()
  }
}

// const searchUsers = async (input: { name: string; address: string }) => {
//   try {
//     searchUserName.value = input.name
//     searchUserAddress.value = input.address
//     if (searchUserName.value || searchUserAddress.value) {
//       await executeSearchUser()
//     }
//   } catch (error) {
//     return useErrorHandler().handleError(error)
//   }
// }
/*onMounted(() => {
  console.log("")
})*/
</script>
