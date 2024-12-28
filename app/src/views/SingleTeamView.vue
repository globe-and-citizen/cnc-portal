<template>
  <div class="flex min-h-screen justify-center">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>

    <div v-if="!teamIsFetching && team" class="pt-10 flex flex-col gap-5 w-full items-center">
      <TeamMeta :team="team" @getTeam="getTeamAPI" />
      <div class="grid grid-cols-4 gap-2">
        <div>
          <ButtonUI
            size="sm"
            variant="primary"
            @click="officerModal = true"
            v-if="team.ownerAddress == currentAddress"
            data-test="manageOfficer"
          >
            Manage Deployments
          </ButtonUI>
        </div>
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

      <ModalComponent v-model="officerModal">
        <OfficerForm
          :team="team"
          @getTeam="
            () => {
              officerModal = false
              getTeamAPI()
            }
          "
          @openInvestorContractModal="
            (deploymentsData?: Deployment[]) => {
              officerModal = false
              investorModal = true

              if ((deploymentsData ?? []).length > 0) {
                deployments = deploymentsData!
                isDeployAll = true
              }
            }
          "
        />
      </ModalComponent>

      <ModalComponent v-model="investorModal">
        <DeployInvestorContractForm
          v-if="investorModal"
          :team="team"
          :isDeployAll="isDeployAll"
          :loading="
            isDeployAll
              ? isLoadingDeployAll || isConfirmingDeployAll
              : isLoadingDeployInvestors || isConfirmingDeployInvestors
          "
          @submit="
            (name: string, symbol: string) => {
              if (isDeployAll) {
                deployAllContracts(name, symbol)
              } else {
                deployInvestorsContract(name, symbol)
              }
            }
          "
        />
      </ModalComponent>

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
          <BankSection v-if="activeTab == 1" :team="team" />
        </template>
        <template #tab-2>
          <BankTransactionsSection v-if="activeTab == 2" :bank-address="team.bankAddress" />
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
          <ExpenseAccountSection v-if="activeTab == 4" :team="team" @get-team="getTeamAPI" />
        </template>
        <template #tab-5>
          <CashRemunerationSection v-if="activeTab == 5" :team="team" />
        </template>
        <template #tab-6>
          <BoardOfDirectorsSection v-if="activeTab == 6" :team="team" />
        </template>
        <template #tab-7>
          <InvestorsSection v-if="activeTab == 7" :team="team" />
        </template>
        <template #tab-8>
          <ContractManagementSection></ContractManagementSection>
        </template>

        <template #tab-9>
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

// Modals/Forms
import OfficerForm from '@/components/forms/OfficerForm.vue'

//Components
import TeamSection from '@/components/sections/SingleTeamView/MemberSection.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import BankTransactionsSection from '@/components/sections/SingleTeamView/BankTransactionsSection.vue'
import BankSection from '@/components/sections/SingleTeamView/BankSection.vue'
import ProposalSection from '@/components/sections/SingleTeamView/ProposalSection.vue'
// import ExpenseAccountSection from '@/components/sections/SingleTeamView/ExpenseAccountSection.vue'
import ExpenseAccountSection from '@/components/sections/SingleTeamView/ExpenseAccountEIP712Section.vue'
import BoardOfDirectorsSection from '@/components/sections/SingleTeamView/BoardOfDirectorsSection.vue'
import CashRemunerationSection from '@/components/sections/SingleTeamView/CashRemunerationSection.vue'

import { type TeamContract, type Deployment, type User, SingleTeamTabs } from '@/types'
import TeamMeta from '@/components/sections/SingleTeamView/TeamMetaSection.vue'
import ContractManagementSection from '@/components/sections/SingleTeamView/ContractManagementSection.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { encodeFunctionData, type Address } from 'viem'
import InvestorsSection from '@/components/sections/SingleTeamView/InvestorsSection.vue'
import DeployInvestorContractForm from '@/components/forms/DeployInvestorContractForm.vue'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import OfficerABI from '@/artifacts/abi/officer.json'
import { log } from '@/utils'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'

//imports for add campaign creation.
import CreateAddCamapaign from '@/components/forms/CreateAddCamapaign.vue'
import { useDeployAddCampaignContract } from '@/composables/addCampaign'
import TeamContracts from '@/components/TeamContracts.vue'

// Modal control states
const tabs = ref<Array<SingleTeamTabs>>([SingleTeamTabs.Members, SingleTeamTabs.TeamContract])
const isOwner = ref(false)
const officerModal = ref(false)

const investorModal = ref(false)
const deployments = ref<Deployment[]>([])
const isDeployAll = ref(false)

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

const {
  writeContract: deployInvestors,
  isPending: isLoadingDeployInvestors,
  data: deployInvestorsHash,
  error: deployInvestorsError
} = useWriteContract()
const { isLoading: isConfirmingDeployInvestors, isSuccess: isConfirmedDeployInvestors } =
  useWaitForTransactionReceipt({ hash: deployInvestorsHash })

const deployInvestorsContract = async (name: string, symbol: string) => {
  const currentAddress = useUserDataStore().address as Address
  const initData = encodeFunctionData({
    abi: INVESTOR_ABI,
    functionName: 'initialize',
    args: [name, symbol, currentAddress]
  })

  deployInvestors({
    address: team.value.officerAddress,
    abi: OfficerABI,
    functionName: 'deployBeaconProxy',
    args: ['InvestorsV1', initData]
  })
}

watch(isConfirmingDeployInvestors, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedDeployInvestors.value) {
    addSuccessToast('Investors deployed successfully')
    getTeamAPI()
    investorModal.value = false
  }
})

watch(deployInvestorsError, (value) => {
  if (value) {
    log.error('Failed to deploy investors', value)
    addErrorToast('Failed to deploy investors')
  }
})

// Deploy All Contracts
const {
  writeContract: deployAll,
  isPending: isLoadingDeployAll,
  error: deployAllError,
  data: deployAllData
} = useWriteContract()

const { isLoading: isConfirmingDeployAll, isSuccess: isConfirmedDeployAll } =
  useWaitForTransactionReceipt({
    hash: deployAllData
  })

watch(isConfirmingDeployAll, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedDeployAll.value) {
    addSuccessToast('All contracts deployed successfully')
    investorModal.value = false
    await getTeamAPI()
    setTabs()
  }
})

const deployAllContracts = async (name: string, symbol: string) => {
  const { address } = useUserDataStore()

  deployments.value.push({
    contractType: 'InvestorsV1',
    initializerData: encodeFunctionData({
      abi: INVESTOR_ABI,
      functionName: 'initialize',
      args: [name, symbol, address as Address]
    })
  })

  deployAll({
    address: team.value.officerAddress,
    abi: OfficerABI,
    functionName: 'deployAllContracts',
    args: [deployments.value]
  })
}

watch(deployAllError, (value) => {
  if (value) {
    log.error('Failed to deploy all contracts', value)
    addErrorToast('Failed to deploy all contracts')
  }
})

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
    team.value.expenseAccountAddress &&
    team.value.investorsAddress
  )
    tabs.value = [
      SingleTeamTabs.Members,
      SingleTeamTabs.Bank,
      SingleTeamTabs.Transactions,
      SingleTeamTabs.Proposals,
      SingleTeamTabs.Expenses,
      SingleTeamTabs.CashRemuneration,
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
