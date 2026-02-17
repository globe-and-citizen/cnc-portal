<template>
  <UCard v-if="safeDepositRouterAddress">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">SafeDepositRouter Configuration</h3>
        <ToggleSafeDepositButton />
      </div>
    </template>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <div class="loading loading-spinner loading-lg" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-4">
      <p class="text-red-500">Failed to load SafeDepositRouter configuration</p>
    </div>

    <!-- Configuration Display -->
    <div v-else class="space-y-4">
      <!-- Status Badges -->
      <div class="flex gap-2 flex-wrap">
        <UBadge
          :color="depositsEnabled ? 'green' : 'gray'"
          variant="subtle"
          data-test="deposits-status-badge"
        >
          Deposits: {{ depositsEnabled ? "Enabled" : "Disabled" }}
        </UBadge>
        <UBadge
          :color="isPaused ? 'red' : 'green'"
          variant="subtle"
          data-test="pause-status-badge"
        >
          Contract: {{ isPaused ? "Paused" : "Active" }}
        </UBadge>
        <UBadge
          :color="canDeposit ? 'green' : 'orange'"
          variant="subtle"
          data-test="can-deposit-badge"
        >
          {{ canDeposit ? "Accepting Deposits" : "Not Accepting Deposits" }}
        </UBadge>
      </div>

      <!-- Configuration Details -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Safe Address -->
        <div>
          <label class="text-sm text-gray-600 dark:text-gray-400"
            >Safe Address</label
          >
          <div class="flex items-center gap-2 mt-1">
            <code
              class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
            >
              {{ truncateAddress(safeAddress) }}
            </code>
            <UButton
              size="xs"
              color="gray"
              variant="ghost"
              icon="i-heroicons-clipboard"
              @click="copyToClipboard(safeAddress)"
            />
          </div>
        </div>

        <!-- Investor Address -->
        <div>
          <label class="text-sm text-gray-600 dark:text-gray-400"
            >Investor Contract</label
          >
          <div class="flex items-center gap-2 mt-1">
            <code
              class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
            >
              {{ truncateAddress(investorAddress) }}
            </code>
            <UButton
              size="xs"
              color="gray"
              variant="ghost"
              icon="i-heroicons-clipboard"
              @click="copyToClipboard(investorAddress)"
            />
          </div>
        </div>

        <!-- Multiplier -->
        <div>
          <label class="text-sm text-gray-600 dark:text-gray-400"
            >SHER Multiplier</label
          >
          <div class="mt-1">
            <span class="text-lg font-semibold"
              >{{ multiplier?.toString() || "0" }}x</span
            >
            <span class="text-sm text-gray-500 ml-2">
              ({{ multiplier?.toString() || "0" }} SHER per 1 token)
            </span>
          </div>
        </div>

        <!-- Owner -->
        <div>
          <label class="text-sm text-gray-600 dark:text-gray-400">Owner</label>
          <div class="flex items-center gap-2 mt-1">
            <code
              class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
            >
              {{ truncateAddress(owner) }}
            </code>
            <UBadge
              v-if="isCurrentUserOwner"
              color="green"
              variant="subtle"
              size="xs"
            >
              You
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Info Alert -->
      <UAlert
        v-if="!canDeposit"
        color="orange"
        variant="subtle"
        icon="i-heroicons-information-circle"
        title="Deposits Not Available"
        :description="getDepositStatusMessage()"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useConnection } from "@wagmi/vue";
import { useSafeDepositRouterReads } from "@/composables/safeDepositRouter";
import ToggleSafeDepositButton from "./ToggleSafeDepositButton.vue";

const toast = useToast();
const connection = useConnection();

const {
  safeDepositRouterAddress,
  safeAddress,
  investorAddress,
  multiplier,
  depositsEnabled,
  isPaused,
  canDeposit,
  owner,
  isLoading,
  error,
} = useSafeDepositRouterReads();

const isCurrentUserOwner = computed(() => {
  if (!connection.isConnected.value || !connection.address.value) return false;
  if (!owner.value) return false;
  return connection.address.value.toLowerCase() === owner.value.toLowerCase();
});

function truncateAddress(address?: string): string {
  if (!address) return "N/A";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function copyToClipboard(text?: string) {
  if (!text) return;
  navigator.clipboard.writeText(text);
  toast.add({
    title: "Copied!",
    description: "Address copied to clipboard",
    color: "success",
  });
}

function getDepositStatusMessage(): string {
  if (isPaused.value) {
    return "The contract is currently paused. Deposits cannot be accepted until it is unpaused.";
  }
  if (!depositsEnabled.value) {
    return "Deposits are currently disabled. The owner must enable deposits to accept new deposits.";
  }
  return "Deposits are not available at this time.";
}
</script>
