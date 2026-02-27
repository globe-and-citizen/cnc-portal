<template>
  <div>
    <ButtonUI
      v-if="safeDepositRouterAddress"
      variant="secondary"
      :loading="isLoading"
      :disabled="!canManageMultiplier || isLoading"
      data-test="set-compensation-multiplier-button"
      @click="openModal"
    >
      <template #prefix>
        <IconifyIcon icon="heroicons:calculator" class="w-4 h-4" />
      </template>
      Set Multiplier ({{ currentMultiplier }}x)
      <template #suffix v-if="!isMultiplierLoading && currentMultiplier">
        <span class="badge badge-sm">{{ currentMultiplier }}x</span>
      </template>
    </ButtonUI>

    <!-- Modal for setting multiplier -->
    <dialog ref="modalRef" class="modal" data-test="multiplier-modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Set SHER Compensation Multiplier</h3>

        <div class="mb-4">
          <p class="text-sm text-base-content/70 mb-2">
            Current multiplier:
            <span class="font-semibold" data-test="current-multiplier">
              {{ isMultiplierLoading ? 'Loading...' : `${currentMultiplier}x` }}
            </span>
          </p>
          <p class="text-sm text-base-content/70">
            The multiplier determines how many SHER tokens are minted per deposited token
            (normalized to 18 decimals).
          </p>
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">New Multiplier</span>
          </label>
          <input
            v-model.number="newMultiplier"
            type="number"
            min="1"
            step="1"
            placeholder="Enter multiplier (minimum 1)"
            class="input input-bordered w-full"
            data-test="multiplier-input"
            :disabled="isLoading"
          />
          <label class="label" v-if="multiplierError">
            <span class="label-text-alt text-error" data-test="multiplier-error">
              {{ multiplierError }}
            </span>
          </label>
          <label class="label" v-else>
            <span class="label-text-alt">
              Example: Multiplier of {{ newMultiplier || 1 }} means 1 token =
              {{ newMultiplier || 1 }} SHER
            </span>
          </label>
        </div>

        <div class="modal-action">
          <ButtonUI
            variant="ghost"
            :disabled="isLoading"
            data-test="cancel-button"
            @click="closeModal"
          >
            Cancel
          </ButtonUI>
          <ButtonUI
            variant="primary"
            :loading="isLoading"
            :disabled="!isMultiplierValid || isLoading"
            data-test="confirm-button"
            @click="handleSetMultiplier"
          >
            Update Multiplier
          </ButtonUI>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConnection } from '@wagmi/vue'
import { Icon as IconifyIcon } from '@iconify/vue'

import ButtonUI from '@/components/ButtonUI.vue'
import { useSetMultiplier } from '@/composables/safeDepositRouter/writes'
import {
  useSafeDepositRouterAddress,
  useSafeDepositRouterMultiplier,
  useSafeDepositRouterOwner
} from '@/composables/safeDepositRouter/reads'
import { useToastStore } from '@/stores'
import { parseError } from '@/utils'

const { addErrorToast, addSuccessToast } = useToastStore()
const connection = useConnection()

// Modal reference
const modalRef = ref<HTMLDialogElement | null>(null)

// Form state
const newMultiplier = ref<number>(1)

// Get SafeDepositRouter address
const safeDepositRouterAddress = useSafeDepositRouterAddress()

// Read current state
const { data: currentMultiplier, isLoading: isMultiplierLoading } = useSafeDepositRouterMultiplier()
const { data: owner, isLoading: isOwnerLoading } = useSafeDepositRouterOwner()

// Write function
const setMultiplierWrite = useSetMultiplier()

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

// Combined loading state
const isReadLoading = computed(() => isMultiplierLoading.value || isOwnerLoading.value)

const isWriteLoading = computed(() => setMultiplierWrite.writeResult.isPending.value)

const isLoading = computed(() => isReadLoading.value || isWriteLoading.value)

// Check if connected user is the owner
const canManageMultiplier = computed(() => {
  if (!connection.isConnected.value || !connection.address?.value) return false
  if (!owner.value) return false
  return connection.address.value.toLowerCase() === (owner.value as string).toLowerCase()
})

// Validate multiplier input
const multiplierError = computed(() => {
  if (!newMultiplier.value) return 'Multiplier is required'
  if (newMultiplier.value < 1) return 'Multiplier must be at least 1'
  if (!Number.isInteger(newMultiplier.value)) return 'Multiplier must be a whole number'
  return null
})

const isMultiplierValid = computed(() => {
  return !multiplierError.value && newMultiplier.value !== Number(currentMultiplier.value)
})

// ============================================================================
// WATCH PATTERNS - Following established patterns
// ============================================================================

// Watch for set multiplier errors
watch(
  () => setMultiplierWrite.writeResult.error.value,
  (error) => {
    if (error) {
      console.error('Error setting multiplier:', error)
      const errorMessage = parseError(error)

      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        addErrorToast('Transaction cancelled by user')
      } else {
        addErrorToast('Failed to update multiplier')
      }
    }
  }
)

// Watch for set multiplier success
watch(
  () => setMultiplierWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      addSuccessToast(`Multiplier updated successfully to ${newMultiplier.value}x`)
      closeModal()
    }
  }
)

// Initialize newMultiplier when currentMultiplier loads
watch(
  currentMultiplier,
  (value) => {
    if (value !== undefined && value !== null) {
      newMultiplier.value = Number(value)
    }
  },
  { immediate: true }
)

// ============================================================================
// METHODS
// ============================================================================

/**
 * Open the modal
 */
function openModal() {
  if (!canManageMultiplier.value) {
    addErrorToast('Only the owner can set the multiplier')
    return
  }

  // Reset to current multiplier
  if (currentMultiplier.value !== undefined && currentMultiplier.value !== null) {
    newMultiplier.value = Number(currentMultiplier.value)
  }

  modalRef.value?.showModal()
}

/**
 * Close the modal
 */
function closeModal() {
  modalRef.value?.close()
}

/**
 * Handle multiplier update
 */
async function handleSetMultiplier() {
  if (!safeDepositRouterAddress.value) {
    addErrorToast('SafeDepositRouter address not found')
    return
  }

  if (!canManageMultiplier.value) {
    addErrorToast('Only the owner can set the multiplier')
    return
  }

  if (!isMultiplierValid.value) {
    addErrorToast('Please enter a valid multiplier')
    return
  }

  await setMultiplierWrite.executeWrite(BigInt(newMultiplier.value))
}
</script>
