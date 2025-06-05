<template>
  <div class="flex flex-row items-center gap-2">
    <label class="input input-bordered flex items-center gap-2 input-md">
      <input
        type="text"
        class="w-72"
        placeholder="Enter token address"
        data-test="token-address-input"
        v-model="tokenAddress.token"
      />
      <SelectComponent :options="options" @change="changeTokenAddress" />
    </label>
    <ButtonUI
      :disabled="false"
      :loading="false"
      :variant="tokenAddress.isSupported ? 'error' : 'primary'"
      data-test="add-token-button"
      @click="updateTokenSupport"
      >{{ tokenAddress.isSupported ? 'Remove Token Support' : 'Add Token Support' }}</ButtonUI
    >
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import SelectComponent from '@/components/SelectComponent.vue'
import { readContract, writeContract } from '@wagmi/core'
import { computed, ref } from 'vue'
import { useTeamStore } from '@/stores'
import { USDC_ADDRESS } from '@/constant'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'
import cashRemunerationAbi from '@/artifacts/abi/CashRemunerationEIP712.json'

const tokenAddress = ref<{ token: string; isSupported: boolean }>({
  token: '',
  isSupported: false
})

const teamStore = useTeamStore()

const investorsAddress = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find((contract) => contract.type === 'InvestorsV1')
      ?.address
)

const cashRemunerationEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts.find(
      (contract) => contract.type === 'CashRemunerationEIP712'
    )?.address
)

const changeTokenAddress = async (address: string) => {
  tokenAddress.value.token = address
  if (!tokenAddress.value.token) {
    tokenAddress.value.isSupported = false
    return
  }

  try {
    const isTokenSupported = await readContract(config, {
      address: cashRemunerationEip712Address.value as Address,
      abi: cashRemunerationAbi,
      functionName: 'supportedTokens',
      args: [tokenAddress.value.token as Address]
    })
    tokenAddress.value.isSupported = isTokenSupported as boolean
  } catch (error) {
    console.error('Error checking token support:', error)
    tokenAddress.value.isSupported = false
  }
}

const updateTokenSupport = async () => {
  if (!tokenAddress.value.token) return

  try {
    if (tokenAddress.value.isSupported) {
      // console.log('Token is already supported')
      // return
      await writeContract(config, {
        address: cashRemunerationEip712Address.value as Address,
        abi: cashRemunerationAbi,
        functionName: 'removeTokenSupport',
        args: [tokenAddress.value.token as Address]
      })
      tokenAddress.value.isSupported = false
    } else {
      await writeContract(config, {
        address: cashRemunerationEip712Address.value as Address,
        abi: cashRemunerationAbi,
        functionName: 'addTokenSupport',
        args: [tokenAddress.value.token as Address]
      })
      tokenAddress.value.isSupported = true
    }
  } catch (error) {
    console.error('Error checking token support:', error)
  }
}

const options = computed(() => {
  return [
    { label: 'Investors', value: investorsAddress.value as Address },
    { label: 'USDC', value: USDC_ADDRESS as Address }
  ] /*.filter(async (address) => {
    const isTokenSupported = await readContract(config, {
      address: cashRemunerationEip712Address.value as Address,
      abi: cashRemunerationAbi,
      functionName: 'supportedTokens',
      args: [address.value as Address]
    })
    console.log(`Token ${address.label} supported:`, isTokenSupported)
    return isTokenSupported as boolean
  })*/
})
</script>
