<template>
  <div>
    <UButton
      v-if="safeDepositRouterAddress"
      color="secondary"
      :loading="isLoading"
      :disabled="!canManageMultiplier || isLoading"
      data-test="set-compensation-multiplier-button"
      @click="openModal"
      leading-icon="heroicons:calculator"
      :label="`Set Multiplier (${formattedCurrentMultiplier}x)`"
    >
      <template #trailing v-if="!isMultiplierLoading && formattedCurrentMultiplier !== '0'">
        <span class="badge badge-sm">{{ formattedCurrentMultiplier }}x</span>
      </template>
    </UButton>

    <!-- Modal for setting multiplier -->
    <dialog ref="modalRef" class="modal" data-test="multiplier-modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Set SHER Compensation Multiplier</h3>

        <div class="mb-4">
          <p class="text-sm text-base-content/70 mb-2">
            Current multiplier:
            <span class="font-semibold" data-test="current-multiplier">
              {{ isMultiplierLoading ? 'Loading...' : `${formattedCurrentMultiplier}x` }}
            </span>
          </p>
          <p class="text-sm text-base-content/70">
            The multiplier determines how many SHER tokens are minted per deposited token. You can
            use decimal values (e.g., 1.5, 2.75).
          </p>
        </div>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">New Multiplier</span>
          </label>
          <input
            v-model="newMultiplier"
            type="text"
            inputmode="decimal"
            placeholder="Enter multiplier (e.g., 1.5)"
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
              Example: Multiplier of {{ displayMultiplierExample }} means 1 USDC =
              {{ displayMultiplierExample }} SHER
            </span>
          </label>
        </div>

        <div class="modal-action">
          <UButton
            variant="ghost"
            :disabled="isLoading"
            data-test="cancel-button"
            @click="closeModal"
            label="Cancel"
          />
          <UButton
            color="primary"
            :loading="isLoading"
            :disabled="!isMultiplierValid || isLoading"
            data-test="confirm-button"
            @click="handleSetMultiplier"
            label="Update Multiplier"
          />
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

import { useSetMultiplier } from '@/composables/safeDepositRouter/writes'
import {
  useSafeDepositRouterAddress,
  useSafeDepositRouterMultiplier,
  useSafeDepositRouterOwner
} from '@/composables/safeDepositRouter/reads'
import { parseError } from '@/utils'
import {
  formatSafeDepositRouterMultiplier,
  parseSafeDepositRouterMultiplier,
  formatSherAmount
} from '@/utils/safeDepositRouterUtil'

const toast = useToast()
const connection = useConnection()

// Modal reference
const modalRef = ref<HTMLDialogElement | null>(null)

// Form state - now accepts string to handle decimals properly
const newMultiplier = ref<string>('1')

// Constants
const MULTIPLIER_DECIMALS = 6
const MIN_MULTIPLIER = 1
const MAX_MULTIPLIER = 1000000

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

// Format the multiplier for display using utility function
const formattedCurrentMultiplier = computed(() => {
  const safeMultiplier =
    typeof currentMultiplier.value === 'bigint' ? currentMultiplier.value : undefined
  return formatSafeDepositRouterMultiplier(safeMultiplier, MULTIPLIER_DECIMALS)
})

// Format display for example text
const displayMultiplierExample = computed(() => {
  if (!newMultiplier.value || newMultiplier.value === '') return '1'
  return formatSherAmount(newMultiplier.value, MULTIPLIER_DECIMALS)
})

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
  if (!newMultiplier.value || newMultiplier.value === '') return 'Multiplier is required'

  const numValue = parseFloat(newMultiplier.value)
  if (isNaN(numValue)) return 'Must be a valid number'
  if (numValue < MIN_MULTIPLIER) return `Multiplier must be at least ${MIN_MULTIPLIER}`
  if (numValue > MAX_MULTIPLIER) return 'Multiplier is too large'

  return null
})

const isMultiplierValid = computed(() => {
  if (multiplierError.value) return false

  // Check if value has actually changed
  const currentValue = parseFloat(formattedCurrentMultiplier.value)
  const newValue = parseFloat(newMultiplier.value)

  return !isNaN(newValue) && newValue !== currentValue
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
        toast.add({ title: 'Transaction cancelled by user', color: 'error' })
      } else {
        toast.add({ title: 'Failed to update multiplier', color: 'error' })
      }
    }
  }
)

// Watch for set multiplier success
watch(
  () => setMultiplierWrite.receiptResult.isSuccess.value,
  (success) => {
    if (success) {
      toast.add({ title: `Multiplier updated successfully to ${formatSherAmount(newMultiplier.value, MULTIPLIER_DECIMALS)}x`, color: 'success' })
      closeModal()
    }
  }
)

// Initialize newMultiplier when currentMultiplier loads
watch(
  formattedCurrentMultiplier,
  (value) => {
    if (value !== undefined && value !== null && value !== '0') {
      newMultiplier.value = value
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
    toast.add({ title: 'Only the owner can set the multiplier', color: 'error' })
    return
  }

  // Reset to current multiplier
  if (formattedCurrentMultiplier.value !== '0') {
    newMultiplier.value = formattedCurrentMultiplier.value
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
 * Converts decimal input to contract format using utility function
 */
async function handleSetMultiplier() {
  if (!safeDepositRouterAddress.value) {
    toast.add({ title: 'SafeDepositRouter address not found', color: 'error' })
    return
  }

  if (!canManageMultiplier.value) {
    toast.add({ title: 'Only the owner can set the multiplier', color: 'error' })
    return
  }

  if (!isMultiplierValid.value) {
    toast.add({ title: 'Please enter a valid multiplier', color: 'error' })
    return
  }

  try {
    // Use utility function to convert decimal string to contract format
    const multiplierInWei = parseSafeDepositRouterMultiplier(
      newMultiplier.value,
      MULTIPLIER_DECIMALS
    )

    if (multiplierInWei === 0n) {
      toast.add({ title: 'Invalid multiplier format', color: 'error' })
      return
    }

    await setMultiplierWrite.executeWrite(multiplierInWei)
  } catch (error) {
    console.error('Error formatting multiplier:', error)
    toast.add({ title: 'Invalid multiplier format', color: 'error' })
  }
}
</script>
