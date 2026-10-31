<template>
  <main
    class="flex min-h-screen items-center justify-center p-6"
    aria-labelledby="network-lock-title"
    data-test="network-lock-screen"
  >
    <UCard class="w-full max-w-md text-center">
      <UIcon name="i-lucide-lock-keyhole" class="text-warning mb-4 size-10" aria-hidden="true" />
      <h1 id="network-lock-title" class="mb-3 text-2xl font-semibold">Session locked</h1>
      <p class="text-muted mb-6">
        Switch your wallet to {{ configuredNetworkName }} to continue. Your session will resume when
        you return to the correct network.
      </p>
      <UAlert
        v-if="switchChain.error.value"
        color="error"
        class="mb-4 text-left"
        description="Network switch was not completed. Check your wallet and try again."
        role="alert"
        data-test="network-switch-error"
      />
      <UButton
        :label="`Switch to ${configuredNetworkName}`"
        :loading="switchChain.isPending.value"
        :disabled="switchChain.isPending.value"
        data-test="switch-network"
        @click="switchChain.mutate({ chainId: configuredChainId })"
      />
    </UCard>
  </main>
</template>

<script setup lang="ts">
import { useSwitchChain } from '@wagmi/vue'
import { configuredChainId, configuredNetworkName } from '@/lib/walletNetwork'

const switchChain = useSwitchChain()
</script>
