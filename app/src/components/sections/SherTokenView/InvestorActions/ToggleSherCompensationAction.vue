<template>
  <div v-if="safeDepositRouterAddress">
    <ActionButton
<<<<<<< Updated upstream:app/src/components/sections/SherTokenView/InvestorActions/ToggleSherCompensationAction.vue
      :icon="depositsEnabled ? 'heroicons:lock-open' : 'heroicons:lock-closed'"
      :icon-bg="
        depositsEnabled ? 'bg-amber-50 dark:bg-amber-950' : 'bg-purple-50 dark:bg-purple-950'
      "
      :icon-color="
        depositsEnabled
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-purple-700 dark:text-purple-400'
      "
      :title="depositsEnabled ? 'Disable SHER Compensation' : 'Enable SHER Compensation'"
      :tone-class="
        depositsEnabled
          ? 'border-amber-200 bg-amber-50/60 hover:border-amber-300 hover:bg-amber-100/70 disabled:border-amber-200 disabled:bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30 dark:hover:border-amber-800 dark:hover:bg-amber-900/40 dark:disabled:border-amber-900 dark:disabled:bg-amber-950/30'
          : 'border-violet-200 bg-violet-50/60 hover:border-violet-300 hover:bg-violet-100/70 disabled:border-violet-200 disabled:bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30 dark:hover:border-violet-800 dark:hover:bg-violet-900/40 dark:disabled:border-violet-900 dark:disabled:bg-violet-950/30'
      "
=======
      :icon="depositsEnabled ? 'heroicons:lock-closed' : 'heroicons:lock-open'"
      icon-bg="bg-purple-50 dark:bg-purple-950"
      icon-color="text-purple-700 dark:text-purple-400"
>>>>>>> Stashed changes:app/src/components/sections/SherTokenView/InvestorActions/ToggleSherCompensationButton.vue
      :loading="isLoading"
      :disabled="!canManageDeposits || isLoading"
      data-test="toggle-sher-compensation-button"
      @click="handleToggleCompensation"
<<<<<<< Updated upstream:app/src/components/sections/SherTokenView/InvestorActions/ToggleSherCompensationAction.vue
    />
=======
    >
      {{ `Enable SHER\nCompensation` }}
    </ActionButton>
>>>>>>> Stashed changes:app/src/components/sections/SherTokenView/InvestorActions/ToggleSherCompensationButton.vue
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConnection } from '@wagmi/vue'
import ActionButton from '@/components/sections/SherTokenView/ActionButton.vue'
import {
  useEnableDeposits,
  useDisableDeposits,
  useSetSafeAddress
} from '@/composables/safeDepositRouter/writes'
import {
  useSafeDepositRouterAddress,
  useSafeDepositRouterSafeAddress,
  useSafeDepositRouterDepositsEnabled,
  useSafeDepositRouterOwner
} from '@/composables/safeDepositRouter/reads'
import { useTeamStore } from '@/stores'
import { parseError } from '@/utils'

const teamStore = useTeamStore()
const toast = useToast()
const connection = useConnection()

const isSettingSafeAddress = ref(false)
const safeAddressErrorShown = ref(false)

const safeDepositRouterAddress = useSafeDepositRouterAddress()

const { data: depositsEnabled, isLoading: isDepositsEnabledLoading } =
  useSafeDepositRouterDepositsEnabled()
const { data: owner, isLoading: isOwnerLoading } = useSafeDepositRouterOwner()
const { data: contractSafeAddress, isLoading: isSafeAddressLoading } =
  useSafeDepositRouterSafeAddress()

const enableDepositsWrite = useEnableDeposits()
const disableDepositsWrite = useDisableDeposits()
const setSafeAddressWrite = useSetSafeAddress()

const isReadLoading = computed(
  () => isDepositsEnabledLoading.value || isOwnerLoading.value || isSafeAddressLoading.value
)

const isWriteLoading = computed(() => {
  return (
    enableDepositsWrite.writeResult.isPending.value ||
    disableDepositsWrite.writeResult.isPending.value ||
    setSafeAddressWrite.writeResult.isPending.value
  )
})

const isLoading = computed(() => isReadLoading.value || isWriteLoading.value)

const canManageDeposits = computed(() => {
  if (!connection.isConnected.value || !connection.address?.value) return false
  if (!owner.value) return false
  return connection.address.value.toLowerCase() === (owner.value as string).toLowerCase()
})

const isSafeAddressCorrect = computed(() => {
  const safeAddress = teamStore.getContractAddressByType('Safe')
  if (!contractSafeAddress.value || !safeAddress) return false
  return (contractSafeAddress.value as string).toLowerCase() === safeAddress.toLowerCase()
})

<<<<<<< Updated upstream:app/src/components/sections/SherTokenView/InvestorActions/ToggleSherCompensationAction.vue
// ============================================================================
// WATCH PATTERNS - Following established patterns
// ============================================================================

// Watch for enable deposits errors
=======
>>>>>>> Stashed changes:app/src/components/sections/SherTokenView/InvestorActions/ToggleSherCompensationButton.vue
watch(
  () => enableDepositsWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error enabling deposits:', error)
      const errorMessage = parseError(error)
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        toast.add({ title: 'Transaction cancelled by user', color: 'error' })
      } else {
        toast.add({ title: 'Failed to enable SHER compensation', color: 'error' })
      }
      isSettingSafeAddress.value = false
    }
  }
)

watch(
  () => enableDepositsWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      toast.add({ title: 'SHER compensation enabled successfully', color: 'success' })
      isSettingSafeAddress.value = false
    }
  }
)

watch(
  () => disableDepositsWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error disabling deposits:', error)
      const errorMessage = parseError(error)
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        toast.add({ title: 'Transaction cancelled by user', color: 'error' })
      } else {
        toast.add({ title: 'Failed to disable SHER compensation', color: 'error' })
      }
    }
  }
)

watch(
  () => disableDepositsWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      toast.add({ title: 'SHER compensation disabled successfully', color: 'success' })
    }
  }
)

watch(
  () => setSafeAddressWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error setting safe address:', error)
      const errorMessage = parseError(error)
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        toast.add({ title: 'Transaction cancelled by user', color: 'error' })
      } else {
        toast.add({ title: 'Failed to update Safe address', color: 'error' })
      }
      isSettingSafeAddress.value = false
    }
  }
)

watch(
  () => setSafeAddressWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success && isSettingSafeAddress.value) {
      toast.add({ title: 'Safe address updated successfully', color: 'success' })
      setTimeout(() => {
        handleEnableDeposits()
      }, 1000)
    }
  }
)

async function updateSafeAddress() {
  const safeAddress = teamStore.getContractAddressByType('Safe')
  if (!safeAddress) {
    if (!safeAddressErrorShown.value) {
      toast.add({ title: 'Safe address not found', color: 'error' })
      safeAddressErrorShown.value = true
    }
    isSettingSafeAddress.value = false
    return
  }
<<<<<<< Updated upstream:app/src/components/sections/SherTokenView/InvestorActions/ToggleSherCompensationAction.vue

  safeAddressErrorShown.value = false
=======
>>>>>>> Stashed changes:app/src/components/sections/SherTokenView/InvestorActions/ToggleSherCompensationButton.vue
  toast.add({ title: 'Updating Safe address...', color: 'info' })
  await setSafeAddressWrite.executeWrite(safeAddress)
}

async function handleEnableDeposits() {
  await enableDepositsWrite.executeWrite()
}

async function handleDisableDeposits() {
  await disableDepositsWrite.executeWrite()
}

async function handleToggleCompensation() {
  if (!safeDepositRouterAddress.value) {
    toast.add({ title: 'SafeDepositRouter address not found', color: 'error' })
    return
  }
  if (!canManageDeposits.value) {
    toast.add({ title: 'Only the owner can manage SHER compensation', color: 'error' })
    return
  }
  if (depositsEnabled.value) {
    await handleDisableDeposits()
    return
  }
  if (!isSafeAddressCorrect.value) {
    isSettingSafeAddress.value = true
    await updateSafeAddress()
    return
  }
  await handleEnableDeposits()
}
</script>
