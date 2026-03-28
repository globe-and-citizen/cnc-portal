<template>
  <div v-if="isCashRemunerationOwner" class="flex flex-row items-center gap-2">
    <div class="flex items-center gap-2">
      <SelectComponent :options="options" v-model="tokenAddress.token" data-test="token-select" />

      <AddressToolTip
        v-if="tokenAddress.token"
        :address="tokenAddress.token"
        class="text-sm font-bold"
      />
    </div>
    <UButton
      :disabled="isLoading || !isValidAddress || isCheckingSupport"
      :loading="isLoading"
      :color="tokenAddress.isSupported ? 'error' : 'primary'"
      variant="outline"
      size="sm"
      data-test="add-token-button"
      @click="updateTokenSupport"
      :label="tokenAddress.isSupported ? 'Remove Token Support' : 'Add Token Support'"
    />
  </div>
</template>

<script setup lang="ts">
import SelectComponent from '@/components/SelectComponent.vue'
import { readContract, writeContract } from '@wagmi/core'
import { computed, ref, watch } from 'vue'
import { useTeamStore, useUserDataStore } from '@/stores'
import { USDC_ADDRESS } from '@/constant'
import type { Address } from 'viem'
import { isAddress } from 'viem'
import { useDebounceFn } from '@vueuse/core'
import { config } from '@/wagmi.config'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { useReadContract } from '@wagmi/vue'

const tokenAddress = ref<{ token: string; isSupported: boolean }>({
  token: '',
  isSupported: false
})

const isLoading = ref(false)
const isCheckingSupport = ref(false)

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toast = useToast()

const isValidAddress = computed(() => {
  return tokenAddress.value.token && isAddress(tokenAddress.value.token)
})

const investorsAddress = computed(() => teamStore.getContractAddressByType('InvestorV1'))

const cashRemunerationEip712Address = computed(() => {
  const address = teamStore.getContractAddressByType('CashRemunerationEIP712')
  if (!address) {
    console.warn('CashRemuneration contract address not found')
  }
  return address
})

const { data: cashRemunerationOwner, error: cashRemunerationOwnerError } = useReadContract({
  functionName: 'owner',
  address: cashRemunerationEip712Address.value as Address,
  abi: CASH_REMUNERATION_EIP712_ABI
})

const isCashRemunerationOwner = computed(() => cashRemunerationOwner.value == userStore.address)

watch(cashRemunerationOwnerError, (value) => {
  if (value) {
    console.error('Failed to fetch cash remuneration owner:', value)
    toast.add({ title: 'Failed to fetch cash remuneration owner', color: 'error' })
  }
})

const checkTokenSupport = useDebounceFn(async (newAddress: string) => {
  if (newAddress && isAddress(newAddress)) {
    isCheckingSupport.value = true
    try {
      const isSupported = await readContract(config, {
        address: cashRemunerationEip712Address.value as Address,
        abi: CASH_REMUNERATION_EIP712_ABI,
        functionName: 'supportedTokens',
        args: [newAddress as Address]
      })
      tokenAddress.value.isSupported = isSupported as boolean
    } catch (error) {
      console.error('Error checking token support:', error)
      toast.add({ title: 'Failed to check token support status', color: 'error' })
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
      toast.add({ title: 'Contract address not configured', color: 'error' })
    }
    return
  }

  isLoading.value = true
  try {
    if (tokenAddress.value.isSupported) {
      await writeContract(config, {
        address: cashRemunerationEip712Address.value as Address,
        abi: CASH_REMUNERATION_EIP712_ABI,
        functionName: 'removeTokenSupport',
        args: [tokenAddress.value.token as Address]
      })
      tokenAddress.value.isSupported = false
      toast.add({ title: 'Token support removed successfully', color: 'success' })
    } else {
      await writeContract(config, {
        address: cashRemunerationEip712Address.value as Address,
        abi: CASH_REMUNERATION_EIP712_ABI,
        functionName: 'addTokenSupport',
        args: [tokenAddress.value.token as Address]
      })
      tokenAddress.value.isSupported = true
      toast.add({ title: 'Token support added successfully', color: 'success' })
    }
  } catch (error: unknown) {
    console.error('Error Updating token support:', error)
    const action = tokenAddress.value.isSupported ? 'remove' : 'add'
    const message =
      error instanceof Error && error.message
        ? `Failed to ${action} token support: ${error.message}`
        : `Failed to ${action} token support`
    toast.add({ title: message, color: 'error' })
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
