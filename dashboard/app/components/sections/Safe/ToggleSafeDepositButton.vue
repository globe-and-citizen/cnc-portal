<template>
  <UButton
    :color="depositsEnabled ? 'orange' : 'primary'"
    :icon="
      depositsEnabled ? 'i-heroicons-lock-closed' : 'i-heroicons-lock-open'
    "
    :loading="isLoading"
    :disabled="!canManageDeposits"
    data-test="toggle-deposits-button"
    @click="handleToggleDeposits"
  >
    {{ depositsEnabled ? "Disable Deposits" : "Enable Deposits" }}
  </UButton>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useConnection } from "@wagmi/vue";
import {
  useSafeDepositRouterReads,
  useSafeDepositRouterFunctions,
} from "@/composables/safeDepositRouter";

const toast = useToast();
const connection = useConnection();

// Read current state
const {
  depositsEnabled,
  owner,
  isLoading: isReadLoading,
  safeDepositRouterAddress,
} = useSafeDepositRouterReads();

// Write functions
const {
  enableDeposits,
  disableDeposits,
  isLoading: isWriteLoading,
  isConfirmed,
} = useSafeDepositRouterFunctions();

// Combined loading state
const isLoading = computed(() => isReadLoading.value || isWriteLoading.value);

// Check if connected user is the owner
const canManageDeposits = computed(() => {
  if (!connection.isConnected.value || !connection.address.value) return false;
  if (!owner.value) return false;
  return connection.address.value.toLowerCase() === owner.value.toLowerCase();
});

/**
 * Toggle deposits enabled/disabled
 */
async function handleToggleDeposits() {
  if (!safeDepositRouterAddress.value) {
    toast.add({
      title: "Error",
      description: "SafeDepositRouter address not found",
      color: "error",
    });
    return;
  }

  if (!canManageDeposits.value) {
    toast.add({
      title: "Error",
      description: "Only the owner can manage deposits",
      color: "error",
    });
    return;
  }

  try {
    if (depositsEnabled.value) {
      // Disable deposits
      await disableDeposits();
    } else {
      // Enable deposits
      await enableDeposits();
    }

    // Wait for confirmation
    const checkConfirmation = setInterval(() => {
      if (isConfirmed.value) {
        clearInterval(checkConfirmation);
        toast.add({
          title: "Success",
          description: `Deposits ${depositsEnabled.value ? "enabled" : "disabled"} successfully`,
          color: "success",
        });
      }
    }, 1000);

    // Cleanup after 30 seconds
    setTimeout(() => clearInterval(checkConfirmation), 30000);
  } catch (error) {
    console.error("Error toggling deposits:", error);
    toast.add({
      title: "Error",
      description: `Failed to ${depositsEnabled.value ? "disable" : "enable"} deposits`,
      color: "error",
    });
  }
}
</script>
