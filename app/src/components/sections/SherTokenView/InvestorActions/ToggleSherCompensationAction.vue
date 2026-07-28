<template>
  <div v-if="safeDepositRouterAddress">
    <UTooltip :text="toggleCompensationTooltip">
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
        :disabled="isWriteDisabled || !canManageDeposits || isEnableBlocked || isLoading"
        data-test="toggle-sher-compensation-button"
        @click="handleToggleCompensation"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useConnection } from '@wagmi/vue'
import { useToast } from '@nuxt/ui/composables'
import ActionButton from '@/components/sections/SherTokenView/ActionButton.vue'
import { useEnableDeposits, useDisableDeposits } from '@/composables/safeDepositRouter/writes'
import {
  useSafeDepositRouterAddress,
  useSafeDepositRouterSafeAddress,
  useSafeDepositRouterDepositsEnabled,
  useSafeDepositRouterOwner
} from '@/composables/safeDepositRouter/reads'
import { useTeamStore } from '@/stores'
import { parseError } from '@/utils'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const SAFE_ADDRESS_REQUIRED_MESSAGE = 'Set the Safe address on the deposit router first'

const teamStore = useTeamStore()
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()
const toast = useToast()

const connection = useConnection()

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

// Combined loading state
const isReadLoading = computed(
  () => isDepositsEnabledLoading.value || isOwnerLoading.value || isSafeAddressLoading.value
)

const isWriteLoading = computed(() => {
  return enableDepositsWrite.isPending.value || disableDepositsWrite.isPending.value
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

// Enabling requires the Safe address to be set first (see SetSafeAddressAction).
// Disabling stays available regardless.
const isEnableBlocked = computed(() => !depositsEnabled.value && !isSafeAddressCorrect.value)

const toggleCompensationTooltip = computed(() => {
  if (archivedTooltip.value) return archivedTooltip.value
  if (isEnableBlocked.value) return SAFE_ADDRESS_REQUIRED_MESSAGE
  return undefined
})

// ============================================================================
// WATCH PATTERNS - Following established patterns
// ============================================================================

// Watch for enable deposits errors
watch(
  () => enableDepositsWrite.error.value,
  (error) => {
    if (error) {
      console.error('Error enabling deposits:', error)
      const errorMessage = parseError(error)

      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        toast.add({ title: 'Transaction cancelled by user', color: 'error' })
      } else {
        toast.add({ title: 'Failed to enable SHER compensation', color: 'error' })
      }
    }
  }
)

// Watch for enable deposits success
watch(
  () => enableDepositsWrite.isSuccess.value,
  (success) => {
    if (success) {
      toast.add({ title: 'SHER compensation enabled successfully', color: 'success' })
    }
  }
)

// Watch for disable deposits errors
watch(
  () => disableDepositsWrite.error.value,
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
  () => disableDepositsWrite.isSuccess.value,
  (success) => {
    if (success) {
      toast.add({ title: 'SHER compensation disabled successfully', color: 'success' })
    }
  }
)

/**
 * Enable deposits
 */
async function handleEnableDeposits() {
  await enableDepositsWrite.mutateAsync({})
}

/**
 * Disable deposits
 */
async function handleDisableDeposits() {
  await disableDepositsWrite.mutateAsync({})
}

/**
 * Toggle SHER token compensation.
 * Enabling requires the Safe address to already be set on the router.
 */
async function handleToggleCompensation() {
  if (isWriteDisabled.value) return

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

  if (!isSafeAddressCorrect.value) {
    toast.add({ title: SAFE_ADDRESS_REQUIRED_MESSAGE, color: 'error' })
    return
  }

  await handleEnableDeposits()
}
</script>
