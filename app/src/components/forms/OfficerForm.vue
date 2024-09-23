<template>
  <div class="flex flex-col">
    <h3 class="text-xl font-bold">Manage deployments</h3>
    <hr />

    <div class="flex items-center justify-center mt-4">
      <button
        class="btn btn-primary btn-sm"
        v-if="!team?.officerAddress"
        @click="deployOfficerContract"
      >
        Create Officer Contract
      </button>
      <div v-else>
        <div class="flex flex-col justify-center items-center">
          <div>
            Officer contract deployed at:
            <span class="badge badge-md badge-primary">
              {{ team?.officerAddress }}
            </span>
          </div>
          <div v-if="showCreateTeam">
            <CreateOfficerTeam :team="team" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { deployContract, getTransactionCount, writeContract } from '@wagmi/core'
import CreateOfficerTeam from '@/components/forms/CreateOfficerTeam.vue'
import { encodeFunctionData, getContractAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { BEACON_PROXY_BYTECODE } from '@/artifacts/bytecode/beacon-proxy'
import BEACON_PROXY_ABI from '@/artifacts/abi/beacon-proxy.json'
import OFFICER_ABI from '@/artifacts/abi/officer.json'
import { BOD_BEACON_ADDRESS, OFFICER_BEACON, VOTING_BEACON_ADDRESS } from '@/constant'
import { useAccount, useReadContract } from '@wagmi/vue'
import { onMounted, ref, watch } from 'vue'
import { useToastStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'

const { addErrorToast, addSuccessToast } = useToastStore()
const props = defineProps(['team'])
const showCreateTeam = ref(false)
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
      console.log(officerAddress.value.officerAddress)
      await executeUpdateTeam()
    }
    // console.log(result)
  } catch (e) {
    console.log(e)
  }
}
const {
  data: getTeamData,
  error: errorGetTeam,
  refetch: refetchGetTeam
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
    console.log(getTeamData.value)
    if (Array.isArray(getTeamData.value) && getTeamData.value[0].length == 0) {
      showCreateTeam.value = true
    }
  }
})
watch(errorGetTeam, (value) => {
  if (value) {
    addErrorToast('Error fetching team data')
  }
})
</script>
