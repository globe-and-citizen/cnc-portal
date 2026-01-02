<template>
  <!-- Loading state while checking account status -->
  <div v-if="isCheckingStatus" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="loading loading-spinner loading-lg mb-4"></div>
      <p>Checking your account setup...</p>
    </div>
  </div>

  <!-- Account Setup Wizard -->
  <AccountSetupWizard
    v-else-if="showWizard"
    :initial-step="initialStep"
    @setup-complete="showWizard = false"
  />

  <!-- Trading view when setup is complete -->
  <div v-else class="text-center">Trading screen...</div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AccountSetupWizard from '@/components/sections/TradingView/AccountSetupWizard.vue'
import { useSafeDeployment, useTokenApprovals, useRelayClient } from '@/composables/trading'
import { log } from '@/utils'

// Composables
const { derivedSafeAddressFromEoa, isSafeDeployed } = useSafeDeployment()
const { checkAllApprovals } = useTokenApprovals()
const { getOrInitializeRelayClient, isReady } = useRelayClient()

// State
const showWizard = ref(false)
const isCheckingStatus = ref(true)
const initialStep = ref(1) // 1 = deploy safe, 2 = approve & configure

// Computed

const checkAccountStatus = async () => {
  if (!derivedSafeAddressFromEoa.value || !isReady.value) {
    isCheckingStatus.value = false
    return false
  }

  isCheckingStatus.value = true

  try {
    // 1. Check if safe is deployed
    const relayClient = await getOrInitializeRelayClient()
    const isDeployed = await isSafeDeployed(relayClient, derivedSafeAddressFromEoa.value)

    if (!isDeployed) {
      // Safe not deployed - show wizard starting at step 1
      showWizard.value = true
      initialStep.value = 1
      isCheckingStatus.value = false
      return false
    }

    // 2. Safe is deployed - check if fully approved
    const approvalCheck = await checkAllApprovals(derivedSafeAddressFromEoa.value)

    if (!approvalCheck.isSetupComplete) {
      // Not fully approved - show wizard starting at step 2
      showWizard.value = true
      initialStep.value = 2
    } else {
      // Fully approved - show trading screen
      showWizard.value = false
    }
  } catch (error) {
    log.error('Error checking account status:', error)
    // On error, default to showing wizard at step 1
    showWizard.value = true
    initialStep.value = 1
  } finally {
    isCheckingStatus.value = false
  }
  return true
}

// Lifecycle
onMounted(async () => {
  // If wallet is already connected, check status
  await checkAccountStatus()
})

// Watch for derived safe address changes (in case of chain switch)
watch(
  () => derivedSafeAddressFromEoa.value,
  async (newAddress) => {
    if (newAddress) {
      await checkAccountStatus()
    }
  }
)

watch(isReady, async () => {
  await checkAccountStatus()
})
</script>
