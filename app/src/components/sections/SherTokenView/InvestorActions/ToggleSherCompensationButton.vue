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
          class="w-4 h-4"
        />
      </template>
      {{ buttonText }}
    </ButtonUI>

    <!-- Safe Address Confirmation Modal -->
    <ModalComponent
      v-model="showSafeAddressModal"
      v-if="mountSafeAddressModal"
      data-test="safe-address-modal"
      @reset="closeSafeAddressModal"
    >
      <div class="space-y-4">
        <h2 class="text-2xl font-bold">Update Safe Address</h2>

        <div class="space-y-2">
          <p class="text-gray-600">
            The Safe address in the SafeDepositRouter contract needs to be updated before enabling
            SHER compensation.
          </p>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-sm font-medium text-yellow-800">Current Contract Address:</p>
            <p class="text-sm text-yellow-900 font-mono break-all">
              {{ contractSafeAddress || 'Not set' }}
            </p>
          </div>

          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-sm font-medium text-green-800">Expected Safe Address:</p>
            <p class="text-sm text-green-900 font-mono break-all">
              {{ teamSafeAddress }}
            </p>
          </div>
        </div>

        <div class="flex gap-3 justify-end">
          <ButtonUI
            variant="secondary"
            @click="closeSafeAddressModal"
            data-test="cancel-safe-address-button"
          >
            Cancel
          </ButtonUI>
          <ButtonUI
            variant="primary"
            :loading="isSafeAddressUpdating"
            :disabled="isSafeAddressUpdating"
            @click="updateSafeAddress"
            data-test="confirm-safe-address-button"
          >
            Update Safe Address
          </ButtonUI>
        </div>
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConnection } from '@wagmi/vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import type { Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
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
const { addErrorToast, addSuccessToast } = useToastStore()
const connection = useConnection()

// Modal state
const showSafeAddressModal = ref(false)
const mountSafeAddressModal = ref(false)

// Get SafeDepositRouter address
const safeDepositRouterAddress = useSafeDepositRouterAddress()

// Get team Safe address from store
const teamSafeAddress = computed(
  () => (teamStore.currentTeamMeta?.data?.safeAddress as Address) ?? ('' as Address)
)

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

// Separate loading state for Safe address update modal
const isSafeAddressUpdating = computed(() => setSafeAddressWrite.writeResult.isPending.value)

// Check if connected user is the owner
const canManageDeposits = computed(() => {
  if (!connection.isConnected.value || !connection.address?.value) return false
  if (!owner.value) return false
  return connection.address.value.toLowerCase() === (owner.value as string).toLowerCase()
})

// Check if Safe address matches
const isSafeAddressCorrect = computed(() => {
  if (!contractSafeAddress.value || !teamSafeAddress.value) return false
  return (contractSafeAddress.value as string).toLowerCase() === teamSafeAddress.value.toLowerCase()
})

// Button text
const buttonText = computed(() => {
  if (isLoading.value) {
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

      // Check for user rejection
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        addErrorToast('Transaction cancelled by user')
      } else {
        addErrorToast(`Failed to enable SHER compensation`)
      }
    }
  }
)

// Watch for enable deposits success
watch(
  () => enableDepositsWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      addSuccessToast('SHER compensation enabled successfully')
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

      // Check for user rejection
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        addErrorToast('Transaction cancelled by user')
      } else {
        addErrorToast(`Failed to disable SHER compensation`)
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

      // Check for user rejection
      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        addErrorToast('Transaction cancelled by user')
      } else {
        addErrorToast(`Failed to update Safe address`)
      }
    }
  }
)

// Watch for set safe address success
watch(
  () => setSafeAddressWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      addSuccessToast('Safe address updated successfully')
      closeSafeAddressModal()

      // Auto-enable deposits after successful update
      setTimeout(() => {
        handleEnableDeposits()
      }, 1000)
    }
  }
)

/**
 * Open Safe address confirmation modal
 */
function openSafeAddressModal() {
  mountSafeAddressModal.value = true
  showSafeAddressModal.value = true
}

/**
 * Close Safe address confirmation modal
 */
function closeSafeAddressModal() {
  showSafeAddressModal.value = false
  mountSafeAddressModal.value = false
}

/**
 * Update Safe address in contract
 */
async function updateSafeAddress() {
  await setSafeAddressWrite.executeWrite(teamSafeAddress.value)
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

  // If trying to enable deposits, check Safe address first
  if (!depositsEnabled.value && !isSafeAddressCorrect.value) {
    openSafeAddressModal()
    return
  }

  // If Safe address is correct or we're disabling, proceed
  if (depositsEnabled.value) {
    await handleDisableDeposits()
  } else {
    await handleEnableDeposits()
  }
}
</script>
