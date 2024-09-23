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
      <div v-else></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { deployContract, getTransactionCount } from '@wagmi/core'
import { encodeFunctionData, getContractAddress } from 'viem'
import { config } from '@/wagmi.config'
import { BEACON_PROXY_BYTECODE } from '@/artifacts/bytecode/beacon-proxy'
import BEACON_PROXY_ABI from '@/artifacts/abi/beacon-proxy.json'
import OFFICER_ABI from '@/artifacts/abi/officer.json'
import { BOD_BEACON_ADDRESS, OFFICER_BEACON, VOTING_BEACON_ADDRESS } from '@/constant'
import { useAccount } from '@wagmi/vue'
import { onMounted, ref } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
const props = defineProps(['team'])
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
onMounted(() => {
  console.log(props.team)
})
</script>
