<template>
  <div class="flex flex-col gap-6">
    <span v-if="teamIsFetching" class="loading loading-spinner loading-lg"></span>
    <div v-if="!teamIsFetching && team" class="flex flex-col gap-5 w-full items-center">
      <TeamMeta :team="team" @getTeam="getTeamAPI" />
      <div>
        <ButtonUI
          size="sm"
          variant="primary"
          @click="addCampaignModal = true"
          v-if="team.ownerAddress == useUserDataStore().address"
          data-test="createAddCampaign"
        >
          Deploy advertise contract
        </ButtonUI>
      </div>
      <CardComponent class="w-full" title="Campaign contract">
        <TeamContracts
          :team-id="String(team.id)"
          :contracts="team.teamContracts"
          @update-contract="handleUpdateContract"
        />
      </CardComponent>
      <ModalComponent v-model="addCampaignModal">
        <CreateAddCamapaign
          @create-add-campaign="deployAddCampaignContract"
          :loading="createAddCampaignLoading"
          :bankAddress="_teamBankContractAddress"
        />
      </ModalComponent>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import CardComponent from '@/components/CardComponent.vue'
// Store imports
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'

// Composables
import { useCustomFetch } from '@/composables/useCustomFetch'

//Components
import ModalComponent from '@/components/ModalComponent.vue'

import { type TeamContract, type User } from '@/types'
import TeamMeta from '@/components/sections/SingleTeamView/TeamMetaSection.vue'

import ButtonUI from '@/components/ButtonUI.vue'
import { type Address } from 'viem'

//imports for add campaign creation.
import CreateAddCamapaign from '@/components/forms/CreateAddCamapaign.vue'
import { useDeployAddCampaignContract } from '@/composables/addCampaign'
import TeamContracts from '@/components/TeamContracts.vue'

// Modal control states

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
