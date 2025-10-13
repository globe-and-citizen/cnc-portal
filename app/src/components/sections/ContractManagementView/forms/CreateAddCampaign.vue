<template>
  <h4 class="font-bold text-lg">Deploy Advertisement Campaign contract</h4>
  <div class="flex flex-col gap-5">
    <h3 class="pt-8">By clicking "Deploy Advertisement"</h3>
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">Bank Contract</span>
      <input
        type="string"
        class="grow"
        v-model="bankAddress"
        disabled="true"
        required
        data-testid="bank-address-input"
      />
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">click rate</span>
      <input
        type="number"
        class="grow"
        placeholder="cost per click in matic"
        v-model="costPerClick"
        required
      />
    </label>
    <label class="input input-bordered flex items-center gap-2 input-md mt-4">
      <span class="w-28">impression rate</span>
      <input
        type="number"
        class="grow"
        placeholder="cost per in matic"
        v-model="costPerImpression"
        required
      />
    </label>
  </div>

  <h3 class="pt-8">
    By clicking "Deploy Advertisement Contract" you agree to deploy an advertisment campaign
    contract and this may take some time and pay for gas fee.
    <ButtonUI class="btn btn-secondary btn-xs" @click="viewContractCode()">view code</ButtonUI>
  </h3>

  <div class="modal-action justify-right">
    <ButtonUI
      variant="primary"
      size="sm"
      @click="deployAdCampaign"
      :loading="loading"
      :disabled="
        loading ||
        !costPerClick ||
        !costPerImpression ||
        parseFloat(costPerClick) <= 0 ||
        parseFloat(costPerImpression) <= 0
      "
    >
      confirm
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'

import { useDeployContract } from '@/composables/useContractFunctions'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores'
import { useTeamStore } from '@/stores'
import AdCampaignAbi from '@/artifacts/abi/AdCampaignManager.json'
import { CAMPAIGN_BYTECODE } from '@/artifacts/bytecode/adCampaignManager.ts'
import type { Abi, Hex } from 'viem'
import { useCustomFetch } from '@/composables/useCustomFetch'

const emit = defineEmits(['closeAddCampaignModal'])
const { addErrorToast, addSuccessToast } = useToastStore()

const campaignAbi = AdCampaignAbi as Abi
const campaignBytecode = CAMPAIGN_BYTECODE as Hex
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const bankAddress = teamStore.getContractAddressByType('Bank')

const costPerClick = ref<string | null>(null)
const costPerImpression = ref<string | null>(null)

function reset() {
  costPerClick.value = null
  costPerImpression.value = null
}
defineExpose({ reset })

//import composable..
// Import composable
const {
  deploy,
  isDeploying: loading,
  contractAddress,
  error: deployError
} = useDeployContract(campaignAbi, campaignBytecode)

watch(contractAddress, async (newAddress) => {
  if (newAddress && teamStore.currentTeam) {
    try {
      // First try to add contract to team
      await addContractToTeam(teamStore.currentTeam.id, newAddress, userDataStore.address)
      await teamStore.fetchTeam(teamStore.currentTeam.id)

      // Only show success and close modal if everything succeeds
      addSuccessToast(`Contract deployed and added to team successfully`)
      emit('closeAddCampaignModal')
    } catch (error) {
      console.error('Failed to add contract to team:', error)
      addErrorToast('Contract deployed but failed to add to team. Please try again.')
    }
  }
})

const addContractToTeam = async (teamId: string, address: string, deployer: string) => {
  const response = await useCustomFetch(`contract`)
    .post({
      teamId,
      contractAddress: address,
      contractType: 'Campaign',
      deployer
    })
    .json()

  if (!response) {
    throw new Error('No response from server')
  }

  return response
}

// Trigger deployment
const deployAdCampaign = async () => {
  if (!costPerClick.value || !costPerImpression.value) {
    addErrorToast('Please enter valid numeric values for both rates.')
    return
  }
  if (!bankAddress) {
    addErrorToast('Bank address is missing.')
    return
  }
  await deploy(bankAddress, costPerClick.value, costPerImpression.value)

  if (deployError.value) {
    let errorMessage = deployError.value?.message || 'deployment failed, please retry'
    if (errorMessage.includes('User rejected the request')) {
      errorMessage = 'User rejected the request'
    }
    addErrorToast(`${errorMessage}`)
  }
}

const viewContractCode = () => {
  const url = 'https://polygonscan.com/address/0x30625FE0E430C3cCc27A60702B79dE7824BE7fD5#code'
  window.open(url, '_blank')
}
</script>
