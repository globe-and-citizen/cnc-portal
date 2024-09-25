<template>
  <div class="flex flex-col">
    <h3 class="text-xl font-bold">Manage deployments</h3>
    <hr />

    <div class="flex items-center justify-center mt-4">
      <button
        class="btn btn-primary btn-sm"
        v-if="!team?.officerAddress && !createOfficerLoading"
        @click="deployOfficerContract"
      >
        Create Officer Contract
      </button>
      <LoadingButton :color="'primary min-w-24'" v-if="createOfficerLoading" />

      <div v-if="team?.officerAddress && !createOfficerLoading">
        <div class="flex flex-col justify-center">
          <div>
            Officer contract deployed at:
            <span class="badge badge-primary badge-sm">
              {{ team?.officerAddress }}
            </span>
          </div>
          <div v-if="showCreateTeam && !isLoadingGetTeam">
            <CreateOfficerTeam :team="team" @getTeam="emits('getTeam')" />
          </div>
          <div v-if="!showCreateTeam && !isLoadingGetTeam">
            <div class="flex flex-col">
              <h5 class="text-md font-bold">Founders</h5>
              <div v-for="(founderAddress, index) in founders" :key="index">
                <span v-if="team && team.members" class="badge badge-primary badge-sm">
                  {{
                    team.members.find((member: Member) => member.address == founderAddress)?.name ||
                    'Unknown Member'
                  }}
                  | {{ founderAddress }}
                </span>
              </div>
            </div>
            <div class="flex flex-col">
              <h5 class="text-md font-bold">Members</h5>
              <div v-for="(memberAddress, index) in members" :key="index">
                <span v-if="team && team.members" class="badge badge-secondary badge-sm">
                  {{
                    team.members.find((member: Member) => member.address == memberAddress)?.name ||
                    'Unknown Member'
                  }}
                  | {{ memberAddress }}
                </span>
              </div>
            </div>
            <div class="flex justify-between mt-4">
              <button class="btn btn-primary btn-sm" v-if="!isBankDeployed">Deploy Bank</button>
              <button class="btn btn-primary btn-sm" v-if="!isVotingDeployed">Deploy Voting</button>
            </div>
          </div>
          <div v-if="isLoadingGetTeam">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { deployContract, getTransactionCount } from '@wagmi/core'
import CreateOfficerTeam from '@/components/forms/CreateOfficerTeam.vue'
import { encodeFunctionData, getContractAddress, zeroAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { BEACON_PROXY_BYTECODE } from '@/artifacts/bytecode/beacon-proxy'
import BEACON_PROXY_ABI from '@/artifacts/abi/beacon-proxy.json'
import OFFICER_ABI from '@/artifacts/abi/officer.json'
import { BOD_BEACON_ADDRESS, OFFICER_BEACON, VOTING_BEACON_ADDRESS } from '@/constant'
import { useAccount, useReadContract } from '@wagmi/vue'
import { onMounted, ref, watch } from 'vue'
import { useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import LoadingButton from '@/components/LoadingButton.vue'
import type { Member } from '@/types'

const { addErrorToast, addSuccessToast } = useToastStore()
const props = defineProps(['team'])
const showCreateTeam = ref(false)
const isBankDeployed = ref(false)
const isVotingDeployed = ref(false)
const founders = ref<Address[]>([])
const members = ref<Address[]>([])
const createOfficerLoading = ref(false)
const emits = defineEmits(['getTeam'])
const officerAddress = ref<{
  officerAddress: string | null
}>({ officerAddress: null })
const { address: currentAddress } = useAccount()
const { execute: executeUpdateTeam } = useCustomFetch(`teams/${props.team.id}`, {
  immediate: false
})
  .put(officerAddress)
  .json()
const deployOfficerContract = async () => {
  try {
    createOfficerLoading.value = true
    const encodedFunction = encodeFunctionData({
      abi: OFFICER_ABI,
      functionName: 'initialize',
      args: [BOD_BEACON_ADDRESS, VOTING_BEACON_ADDRESS]
    })

    await deployContract(config, {
      abi: BEACON_PROXY_ABI,
      bytecode: BEACON_PROXY_BYTECODE,
      args: [OFFICER_BEACON, encodedFunction]
    })
    let nonce
    if (currentAddress.value) {
      nonce = await getTransactionCount(config, { address: currentAddress.value })
    }
    if (nonce && currentAddress.value) {
      officerAddress.value.officerAddress = getContractAddress({
        from: currentAddress.value,
        nonce: BigInt(nonce)
      })
      addSuccessToast('Officer contract created successfully')

      await executeUpdateTeam()
      createOfficerLoading.value = false
      emits('getTeam')
    }
  } catch (e) {
    createOfficerLoading.value = false
    console.log(e)
    addErrorToast('Failed to deploy officer contract')
  }
}
const {
  data: getTeamData,
  error: errorGetTeam,
  refetch: refetchGetTeam,
  isLoading: isLoadingGetTeam
} = useReadContract({
  abi: OFFICER_ABI,
  address: props.team.officerAddress as Address,
  functionName: 'getTeam'
})
onMounted(async () => {
  if (props.team.officerAddress) {
    refetchGetTeam()
  }
})
watch(getTeamData, (value) => {
  if (value) {
    if (Array.isArray(getTeamData.value) && getTeamData.value[0].length == 0) {
      showCreateTeam.value = true
    } else {
      showCreateTeam.value = false
      founders.value = (getTeamData.value as [Address[], Address[]])[0] as Address[]
      members.value = (getTeamData.value as [Address[], Address[]])[1] as Address[]
      isBankDeployed.value =
        ((getTeamData.value as Address)[2] as Address) != zeroAddress ? true : false
      isVotingDeployed.value =
        ((getTeamData.value as Address)[3] as Address) != zeroAddress ? true : false
    }
  }
})
watch(errorGetTeam, (value) => {
  if (value) {
    console.log(errorGetTeam.value)
    addErrorToast('Error fetching team data')
  }
})
</script>
