<template>
  <div class="space-y-6 animate-fade-in">
    <div class="bg-base-200 p-6 rounded-xl space-y-4">
      <div class="flex items-center gap-3">
        <IconifyIcon icon="heroicons:shield-check" class="w-8 h-8 text-primary" />
        <div>
          <h3 class="font-semibold">Polymarket Safe Deployment</h3>
          <p class="text-sm text-gray-500">Gnosis Safe wallet for trading</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="bg-base-300 p-3 rounded-lg">
          <span class="text-gray-500">Network</span>
          <p class="font-mono">Polygon</p>
        </div>
        <div class="bg-base-300 p-3 rounded-lg">
          <span class="text-gray-500">Safe Address</span>
          <p class="font-mono">
            {{
              derivedSafeAddressFromEoa
                ? `${derivedSafeAddressFromEoa.slice(0, 6)}...${derivedSafeAddressFromEoa.slice(-4)}`
                : ''
            }}
          </p>
        </div>
      </div>
    </div>
    <ButtonUI
      @click="$emit('deploy-safe')"
      :disabled="isProcessing"
      variant="primary"
      size="lg"
      :wide="true"
      class="w-full text-white"
    >
      <IconifyIcon v-if="isProcessing" icon="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
      {{ isProcessing ? 'Deploying...' : 'Deploy Polymarket Safe' }}
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useSafeDeployment } from '@/composables/trading'

defineProps<{ isProcessing: boolean }>()
defineEmits(['deploy-safe'])

const { derivedSafeAddressFromEoa } = useSafeDeployment()
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
