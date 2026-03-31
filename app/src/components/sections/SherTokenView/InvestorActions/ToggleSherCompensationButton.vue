<template>
  <div v-if="safeDepositRouterAddress">
    <ActionButton
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
      :loading="isLoading"
      :disabled="!canManageDeposits || isLoading"
      data-test="toggle-sher-compensation-button"
      @click="handleToggleCompensation"
    />
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

// Track if we're in the process of setting safe address before enabling
const isSettingSafeAddress = ref(false)
const safeAddressErrorShown = ref(false)

// Get SafeDepositRouter address
const safeDepositRouterAddress = useSafeDepositRouterAddress()

// Read current state
const { data: depositsEnabled, isLoading: isDepositsEnabledLoading } =
  useSafeDepositRouterDepositsEnabled()
const { data: owner, isLoading: isOwnerLoading } = useSafeDepositRouterOwner()
const { data: contractSafeAddress, isLoading: isSafeAddressLoading } =
  useSafeDepositRouterSafeAddress()

// Write functions
const enableDepositsWrite = useEnableDeposits()
const disableDepositsWrite = useDisableDeposits()
const setSafeAddressWrite = useSetSafeAddress()

// Combined loading state
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

// Check if connected user is the owner
const canManageDeposits = computed(() => {
  if (!connection.isConnected.value || !connection.address?.value) return false
  if (!owner.value) return false
  return connection.address.value.toLowerCase() === (owner.value as string).toLowerCase()
})

// Check if Safe address matches
const isSafeAddressCorrect = computed(() => {
  const safeAddress = teamStore.getContractAddressByType('Safe')
  if (!contractSafeAddress.value || !safeAddress) return false

  return (contractSafeAddress.value as string).toLowerCase() === safeAddress.toLowerCase()
})

// ============================================================================
// WATCH PATTERNS - Following established patterns
// ============================================================================

// Watch for enable deposits errors
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

// Watch for enable deposits success
watch(
  () => enableDepositsWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      toast.add({ title: 'SHER compensation enabled successfully', color: 'success' })
      isSettingSafeAddress.value = false
    }
  }
)

// Watch for disable deposits errors
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

// Watch for disable deposits success
watch(
  () => disableDepositsWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      toast.add({ title: 'SHER compensation disabled successfully', color: 'success' })
    }
  }
)

// Watch for set safe address errors
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

// Watch for set safe address success - automatically enable deposits after
watch(
  () => setSafeAddressWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success && isSettingSafeAddress.value) {
      toast.add({ title: 'Safe address updated successfully', color: 'success' })

      // Auto-enable deposits after successful Safe address update
      setTimeout(() => {
        handleEnableDeposits()
      }, 1000)
    }
  }
)

/**
 * Update Safe address in contract
 */
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

  safeAddressErrorShown.value = false
  toast.add({ title: 'Updating Safe address...', color: 'info' })
  await setSafeAddressWrite.executeWrite(safeAddress)
}

/**
 * Enable deposits
 */
async function handleEnableDeposits() {
  await enableDepositsWrite.executeWrite()
}

/**
 * Disable deposits
 */
async function handleDisableDeposits() {
  await disableDepositsWrite.executeWrite()
}

/**
 * Toggle SHER token compensation
 * If enabling and Safe address is not set, automatically set it first
 */
async function handleToggleCompensation() {
  if (!safeDepositRouterAddress.value) {
    toast.add({ title: 'SafeDepositRouter address not found', color: 'error' })
    return
  }

  if (!canManageDeposits.value) {
    toast.add({ title: 'Only the owner can manage SHER compensation', color: 'error' })
    return
  }

  // If disabling, proceed directly
  if (depositsEnabled.value) {
    await handleDisableDeposits()
    return
  }

  // If enabling and Safe address is not correct, set it first
  if (!isSafeAddressCorrect.value) {
    isSettingSafeAddress.value = true
    await updateSafeAddress()
    // The watch on setSafeAddress success will automatically call handleEnableDeposits
    return
  }

  // If Safe address is already correct, enable directly
  await handleEnableDeposits()
}
</script>
