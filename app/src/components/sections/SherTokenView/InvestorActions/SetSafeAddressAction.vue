<template>
  <div v-if="safeDepositRouterAddress">
    <UTooltip :text="safeAddressTooltip">
      <ActionButton
        icon="heroicons:link"
        icon-bg="bg-indigo-50 dark:bg-indigo-950"
        icon-color="text-indigo-700 dark:text-indigo-400"
        title="Set Safe Address"
        tone-class="border-indigo-200 bg-indigo-50/60 hover:border-indigo-300 hover:bg-indigo-100/70 disabled:border-indigo-200 disabled:bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30 dark:hover:border-indigo-800 dark:hover:bg-indigo-900/40 dark:disabled:border-indigo-900 dark:disabled:bg-indigo-950/30"
        :badge="isSafeAddressSynced ? 'Set' : undefined"
        :loading="isLoading"
        :disabled="isWriteDisabled || !canManageSafeAddress || isSafeAddressSynced || isLoading"
        data-test="set-safe-address-button"
        @click="handleSetSafeAddress"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useConnection } from '@wagmi/vue'
import { useToast } from '@nuxt/ui/composables'
import ActionButton from '@/components/sections/SherTokenView/ActionButton.vue'
import { useSetSafeAddress } from '@/composables/safeDepositRouter/writes'
import {
  useSafeDepositRouterAddress,
  useSafeDepositRouterSafeAddress,
  useSafeDepositRouterOwner
} from '@/composables/safeDepositRouter/reads'
import { useTeamStore } from '@/stores'
import { classifyError } from '@/utils/errors/classifyContractError'
import { log } from '@/lib/logging'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const teamStore = useTeamStore()
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()
const toast = useToast()
const connection = useConnection()

const safeDepositRouterAddress = useSafeDepositRouterAddress()

const { data: owner, isLoading: isOwnerLoading } = useSafeDepositRouterOwner()
const { data: contractSafeAddress, isLoading: isSafeAddressLoading } =
  useSafeDepositRouterSafeAddress()

const setSafeAddressWrite = useSetSafeAddress()

const isReadLoading = computed(() => isOwnerLoading.value || isSafeAddressLoading.value)
const isLoading = computed(() => isReadLoading.value || setSafeAddressWrite.isPending.value)

const teamSafeAddress = computed(() => teamStore.getContractAddressByType('Safe'))

// Check if connected user is the owner
const canManageSafeAddress = computed(() => {
  if (!connection.isConnected.value || !connection.address?.value) return false
  if (!owner.value) return false
  return connection.address.value.toLowerCase() === (owner.value as string).toLowerCase()
})

// The router already points at the team Safe — nothing to do
const isSafeAddressSynced = computed(() => {
  if (!contractSafeAddress.value || !teamSafeAddress.value) return false
  return (contractSafeAddress.value as string).toLowerCase() === teamSafeAddress.value.toLowerCase()
})

const safeAddressTooltip = computed(() => {
  if (archivedTooltip.value) return archivedTooltip.value
  if (!canManageSafeAddress.value) return 'Only the owner can set the Safe address'
  if (isSafeAddressSynced.value) return 'The Safe address is already up to date'
  return 'Point the deposit router at the team Safe'
})

watch(
  () => setSafeAddressWrite.error.value,
  (error) => {
    if (error) {
      log.error('Error setting safe address:', error)
      const classified = classifyError(error, { contract: 'SafeDepositRouter' })
      toast.add({ title: classified.userMessage, color: 'error' })
    }
  }
)

watch(
  () => setSafeAddressWrite.isSuccess.value,
  (success) => {
    if (success) {
      toast.add({ title: 'Safe address updated successfully', color: 'success' })
    }
  }
)

/**
 * Set the team Safe address on the SafeDepositRouter.
 * SHER compensation can only be enabled once this is done.
 */
async function handleSetSafeAddress() {
  if (isWriteDisabled.value) return

  if (!safeDepositRouterAddress.value) {
    toast.add({ title: 'SafeDepositRouter address not found', color: 'error' })
    return
  }

  if (!canManageSafeAddress.value) {
    toast.add({ title: 'Only the owner can set the Safe address', color: 'error' })
    return
  }

  if (!teamSafeAddress.value) {
    toast.add({ title: 'Safe address not found', color: 'error' })
    return
  }

  if (isSafeAddressSynced.value) return

  toast.add({ title: 'Updating Safe address...', color: 'info' })
  await setSafeAddressWrite.mutateAsync({ args: [teamSafeAddress.value] })
}
</script>
