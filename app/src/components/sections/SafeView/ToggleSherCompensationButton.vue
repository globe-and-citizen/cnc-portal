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
      <div class="p-6 space-y-4">
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
              {{ safeAddress }}
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
            :loading="isUpdatingSafeAddress"
            :disabled="isUpdatingSafeAddress"
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
import { computed, ref } from 'vue'
import { useConnection } from '@wagmi/vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import type { Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import {
  useSafeDepositRouterReads,
  useSafeDepositRouterFunctions
} from '@/composables/safeDepositRouter'
import { useToastStore } from '@/stores'

interface Props {
  safeAddress: Address
}

const props = defineProps<Props>()

const { addErrorToast, addSuccessToast } = useToastStore()
const connection = useConnection()

// Modal state
const showSafeAddressModal = ref(false)
const mountSafeAddressModal = ref(false)
const isUpdatingSafeAddress = ref(false)

// Read current state
const {
  depositsEnabled,
  owner,
  safeAddress: contractSafeAddress,
  isLoading: isReadLoading,
  safeDepositRouterAddress
} = useSafeDepositRouterReads()

// Write functions
const {
  enableDeposits,
  disableDeposits,
  setSafeAddress: updateContractSafeAddress,
  isLoading: isWriteLoading,
  isConfirmed
} = useSafeDepositRouterFunctions()

// Combined loading state
const isLoading = computed(() => isReadLoading.value || isWriteLoading.value)

// Check if connected user is the owner
const canManageDeposits = computed(() => {
  if (!connection.isConnected.value || !connection.address.value) return false
  if (!owner.value) return false
  return connection.address.value.toLowerCase() === owner.value.toLowerCase()
})

// Check if Safe address matches
const isSafeAddressCorrect = computed(() => {
  if (!contractSafeAddress.value || !props.safeAddress) return false
  return contractSafeAddress.value.toLowerCase() === props.safeAddress.toLowerCase()
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
  if (!props.safeAddress) {
    addErrorToast('Invalid Safe address')
    return
  }

  isUpdatingSafeAddress.value = true

  try {
    await updateContractSafeAddress(props.safeAddress)

    // Wait for confirmation
    const checkConfirmation = setInterval(() => {
      if (isConfirmed.value) {
        clearInterval(checkConfirmation)
        addSuccessToast('Safe address updated successfully')
        closeSafeAddressModal()

        // Auto-enable deposits after successful update
        setTimeout(() => {
          handleEnableDeposits()
        }, 1000)
      }
    }, 1000)

    // Cleanup after 30 seconds
    setTimeout(() => clearInterval(checkConfirmation), 30000)
  } catch (error) {
    console.error('Error updating Safe address:', error)
    addErrorToast('Failed to update Safe address')
  } finally {
    isUpdatingSafeAddress.value = false
  }
}

/**
 * Enable deposits
 */
async function handleEnableDeposits() {
  try {
    await enableDeposits()

    // Wait for confirmation
    const checkConfirmation = setInterval(() => {
      if (isConfirmed.value) {
        clearInterval(checkConfirmation)
        addSuccessToast('SHER compensation enabled successfully')
      }
    }, 1000)

    // Cleanup after 30 seconds
    setTimeout(() => clearInterval(checkConfirmation), 30000)
  } catch (error) {
    console.error('Error enabling deposits:', error)
    addErrorToast('Failed to enable SHER compensation')
  }
}

/**
 * Disable deposits
 */
async function handleDisableDeposits() {
  try {
    await disableDeposits()

    // Wait for confirmation
    const checkConfirmation = setInterval(() => {
      if (isConfirmed.value) {
        clearInterval(checkConfirmation)
        addSuccessToast('SHER compensation disabled successfully')
      }
    }, 1000)

    // Cleanup after 30 seconds
    setTimeout(() => clearInterval(checkConfirmation), 30000)
  } catch (error) {
    console.error('Error disabling deposits:', error)
    addErrorToast('Failed to disable SHER compensation')
  }
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
