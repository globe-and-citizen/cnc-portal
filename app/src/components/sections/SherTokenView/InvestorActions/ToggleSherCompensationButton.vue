<template>
  <div>
    <ButtonUI
      v-if="safeDepositRouterAddress"
      :variant="depositsEnabled ? 'warning' : 'primary'"
      :loading="isLoading"
      :disabled="!canManageDeposits || isLoading"
      data-test="toggle-sher-compensation-button"
      @click="handleToggleCompensation"
    >
      <template #prefix>
        <IconifyIcon
          :icon="depositsEnabled ? 'heroicons:lock-closed' : 'heroicons:lock-open'"
          class="h-4 w-4"
        />
      </template>
      {{ buttonText }}
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConnection } from '@wagmi/vue'
import { Icon as IconifyIcon } from '@iconify/vue'

import ButtonUI from '@/components/ButtonUI.vue'
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
import { useToastStore } from '@/stores'
import { useTeamStore } from '@/stores'
import { parseError } from '@/utils'

const teamStore = useTeamStore()
const { addErrorToast, addSuccessToast, addInfoToast } = useToastStore()
const connection = useConnection()

// Track if we're in the process of setting safe address before enabling
const isSettingSafeAddress = ref(false)

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

// Button text
const buttonText = computed(() => {
  if (isLoading.value) {
    if (isSettingSafeAddress.value) {
      return 'Setting Safe Address...'
    }
    return depositsEnabled.value
      ? 'Disabling SHER Compensation...'
      : 'Enabling SHER Compensation...'
  }
  return depositsEnabled.value ? 'Disable SHER Compensation' : 'Enable SHER Compensation'
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
        addErrorToast('Transaction cancelled by user')
      } else {
        addErrorToast('Failed to enable SHER compensation')
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
      addSuccessToast('SHER compensation enabled successfully')
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
        addErrorToast('Transaction cancelled by user')
      } else {
        addErrorToast('Failed to disable SHER compensation')
      }
    }
  }
)

// Watch for disable deposits success
watch(
  () => disableDepositsWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      addSuccessToast('SHER compensation disabled successfully')
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
        addErrorToast('Transaction cancelled by user')
      } else {
        addErrorToast('Failed to update Safe address')
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
      addSuccessToast('Safe address updated successfully')

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
    addErrorToast('Safe address not found')
    isSettingSafeAddress.value = false
    return
  }

  addInfoToast('Updating Safe address...')
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
    addErrorToast('SafeDepositRouter address not found')
    return
  }

  if (!canManageDeposits.value) {
    addErrorToast('Only the owner can manage SHER compensation')
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
