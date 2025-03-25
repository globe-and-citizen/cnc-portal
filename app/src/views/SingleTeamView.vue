<template>
  <div class="flex min-h-screen justify-center">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>

    <div v-if="!teamIsFetching && team" class="flex flex-col gap-5 w-full items-center">
      <TeamMeta :team="team" @getTeam="getTeamAPI" />
      <div class="grid grid-cols-4 gap-2">
        <div>
          <ButtonUI
            size="sm"
            variant="primary"
            @click="addCampaignModal = true"
            v-if="!team.addCampaignAddress && team.ownerAddress == useUserDataStore().address"
            data-test="createAddCampaign"
          >
            Deploy advertise contract
          </ButtonUI>
        </div>
      </div>


      <ModalComponent v-model="addCampaignModal">
        <CreateAddCamapaign
          @create-add-campaign="deployAddCampaignContract"
          :loading="createAddCampaignLoading"
          :bankAddress="_teamBankContractAddress"
        />
      </ModalComponent>
      <TabNavigation v-model="activeTab" :tabs="tabs" class="w-full">
        <template #tab-0>
          <div id="members" v-if="activeTab == 0">
            <TeamSection :team="team" :teamIsFetching="teamIsFetching" @getTeam="getTeamAPI" />
          </div>
        </template>
        <template #tab-1>
        </template>
        <template #tab-2>
        </template>
        <template #tab-3>
          <ProposalSection
            v-if="activeTab == 3"
            :team="team"
            @getTeam="getTeamAPI"
            @addBodTab="() => tabs.push(SingleTeamTabs.BoardOfDirectors)"
          />
        </template>
        <template #tab-4>
          <BoardOfDirectorsSection v-if="activeTab == 6" :team="team" />
        </template>
        <template #tab-5>
          <InvestorsSection v-if="activeTab == 7" :team="team" />
        </template>
        <template #tab-6>
          <ContractManagementSection></ContractManagementSection>
        </template>

        <template #tab-7>
          <TeamContracts
            :team-id="String(team.id)"
            :contracts="team.teamContracts"
            @update-contract="handleUpdateContract"
          />
        </template>
      </TabNavigation>
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


//Components
import TeamSection from '@/components/sections/SingleTeamView/MemberSection.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import ProposalSection from '@/components/sections/SingleTeamView/ProposalSection.vue'
import BoardOfDirectorsSection from '@/components/sections/SingleTeamView/BoardOfDirectorsSection.vue'

import { type TeamContract,  type User, SingleTeamTabs } from '@/types'
import TeamMeta from '@/components/sections/SingleTeamView/TeamMetaSection.vue'
import ContractManagementSection from '@/components/sections/SingleTeamView/ContractManagementSection.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { type Address } from 'viem'
import InvestorsSection from '@/components/sections/SingleTeamView/InvestorsSection.vue'

//imports for add campaign creation.
import CreateAddCamapaign from '@/components/forms/CreateAddCamapaign.vue'
import { useDeployAddCampaignContract } from '@/composables/addCampaign'
import TeamContracts from '@/components/TeamContracts.vue'

// Modal control states
const tabs = ref<Array<SingleTeamTabs>>([SingleTeamTabs.Members, SingleTeamTabs.TeamContract])
const isOwner = ref(false)

const _teamBankContractAddress = ref('')

//addCampaign
const addCampaignModal = ref(false)
const {
  contractAddress: addCampaignContractAddress,
  execute: createAddCampaign,
  isLoading: createAddCampaignLoading
  //isSuccess: CreateAddCamapaignSuccess,
  //error: CreateAddCamapaignError
} = useDeployAddCampaignContract()

// CRUD input refs
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')

const activeTab = ref(0)

const route = useRoute()

const { addErrorToast, addSuccessToast } = useToastStore()

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
const currentAddress = useUserDataStore().address as Address
onMounted(async () => {
  console.log(team.value)
  await getTeamAPI() //Call the execute function to get team details on mount
  if (team?.value?.ownerAddress == currentAddress) {
    isOwner.value = true
  }
  _teamBankContractAddress.value = team.value?.bankAddress
    ? team.value.bankAddress
    : team.value?.ownerAddress
      ? team.value.ownerAddress
      : ''
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

const handleUpdateContract = ({
  index,
  updatedContractPayload
}: {
  index: number
  updatedContractPayload: TeamContract
}) => {
  team.value.teamContracts[index] = updatedContractPayload
  addSuccessToast('Contract updated successfully')
}

const setTabs = () => {
  if (
    team.value.bankAddress &&
    team.value.votingAddress &&
    team.value.boardOfDirectorsAddress &&
    team.value.investorsAddress
  )
    tabs.value = [
      SingleTeamTabs.Members,
      SingleTeamTabs.Bank,
      SingleTeamTabs.Transactions,
      SingleTeamTabs.Proposals,
      SingleTeamTabs.BoardOfDirectors,
      SingleTeamTabs.Investors,
      SingleTeamTabs.Contract,
      SingleTeamTabs.TeamContract
    ]
}

// Add Campaign functions.
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
</script>
