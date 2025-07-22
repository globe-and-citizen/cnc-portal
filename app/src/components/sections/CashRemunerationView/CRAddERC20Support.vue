<template>
  <div class="flex flex-row items-center gap-2">
    <div class="flex items-center gap-2">
      <SelectComponent :options="options" v-model="tokenAddress.token" data-test="token-select" />

      <AddressToolTip
        v-if="tokenAddress.token"
        :address="tokenAddress.token"
        class="text-sm font-bold"
      />
    </div>
    <ButtonUI
      :disabled="isLoading || !isValidAddress || isCheckingSupport"
      :loading="isLoading"
      :variant="tokenAddress.isSupported ? 'error' : 'primary'"
      outline
      size="sm"
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
import { computed, ref, watch } from 'vue'
import { useTeamStore, useToastStore } from '@/stores'
import { USDC_ADDRESS } from '@/constant'
import type { Address } from 'viem'
import { isAddress } from 'viem'
import { useDebounceFn } from '@vueuse/core'
import { config } from '@/wagmi.config'
import cashRemunerationAbi from '@/artifacts/abi/CashRemunerationEIP712.json'
import AddressToolTip from '@/components/AddressToolTip.vue'

const tokenAddress = ref<{ token: string; isSupported: boolean }>({
  token: '',
  isSupported: false
})

const isLoading = ref(false)
const isCheckingSupport = ref(false)

const teamStore = useTeamStore()
const { addErrorToast, addSuccessToast } = useToastStore()

const isValidAddress = computed(() => {
  return tokenAddress.value.token && isAddress(tokenAddress.value.token)
})

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorsV1'))

const cashRemunerationEip712Address = computed(() => {
  const address = teamStore.getContractAddressByType('CashRemunerationEIP712')
  if (!address) {
    console.warn('CashRemunerationEIP712 contract address not found')
  }
  return address
})

const checkTokenSupport = useDebounceFn(async (newAddress: string) => {
  if (newAddress && isAddress(newAddress)) {
    isCheckingSupport.value = true
    try {
      const isSupported = await readContract(config, {
        address: cashRemunerationEip712Address.value as Address,
        abi: cashRemunerationAbi,
        functionName: 'supportedTokens',
        args: [newAddress as Address]
      })
      tokenAddress.value.isSupported = isSupported as boolean
    } catch (error) {
      console.error('Error checking token support:', error)
      addErrorToast('Failed to check token support status')
      tokenAddress.value.isSupported = false
    } finally {
      isCheckingSupport.value = false
    }
  } else {
    tokenAddress.value.isSupported = false
  }
}, 300)

watch(() => tokenAddress.value.token, checkTokenSupport, { immediate: true })

const updateTokenSupport = async () => {
  if (!tokenAddress.value.token || isLoading.value || !cashRemunerationEip712Address.value) {
    if (!cashRemunerationEip712Address.value) {
      addErrorToast('Contract address not configured')
    }
    return
  }

  isLoading.value = true
  try {
    if (tokenAddress.value.isSupported) {
      await writeContract(config, {
        address: cashRemunerationEip712Address.value as Address,
        abi: cashRemunerationAbi,
        functionName: 'removeTokenSupport',
        args: [tokenAddress.value.token as Address]
      })
      tokenAddress.value.isSupported = false
      addSuccessToast('Token support removed successfully')
    } else {
      await writeContract(config, {
        address: cashRemunerationEip712Address.value as Address,
        abi: cashRemunerationAbi,
        functionName: 'addTokenSupport',
        args: [tokenAddress.value.token as Address]
      })
      tokenAddress.value.isSupported = true
      addSuccessToast('Token support added successfully')
    }
  } catch (error: unknown) {
    console.error('Error Updating token support:', error)
    const action = tokenAddress.value.isSupported ? 'remove' : 'add'
    const message =
      error instanceof Error && error.message
        ? `Failed to ${action} token support: ${error.message}`
        : `Failed to ${action} token support`
    addErrorToast(message)
  } finally {
    isLoading.value = false
  }
}

interface TokenOption {
  label: string
  value: Address
}

const options = computed((): TokenOption[] => {
  return [
    { label: 'Investors', value: investorsAddress.value as Address },
    { label: 'USDC', value: USDC_ADDRESS as Address }
  ]
})
</script>
