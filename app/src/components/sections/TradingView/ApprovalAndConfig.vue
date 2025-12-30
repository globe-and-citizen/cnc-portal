<template>
  <div class="space-y-6 animate-fade-in">
    <div class="collapse collapse-plus bg-base-200 rounded-xl mb-4">
      <input type="checkbox" />
      <div class="collapse-title text-xl font-medium px-6 py-4">
        <div class="flex items-center gap-3">
          <IconifyIcon icon="heroicons:currency-dollar" class="w-6 h-6 text-primary" />
          <div class="text-left">
            <p class="text-lg font-semibold">USDC.e Approvals</p>
            <p class="text-sm text-gray-500">Approve USDC for Polymarket trading</p>
          </div>
        </div>
      </div>
      <div class="collapse-content px-6 pb-4">
        <div class="space-y-2">
          <div
            v-for="(approval, index) in usdcApprovals"
            :key="index"
            class="flex items-center justify-between bg-base-300 p-3 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span class="font-mono text-xs text-blue-400">USDC</span>
              </div>
              <div>
                <p class="text-sm font-medium">{{ approval.contract }}</p>
                <p class="font-mono text-xs text-gray-500">
                  {{ approval.address.slice(0, 6) }}...{{ approval.address.slice(-4) }}
                </p>
              </div>
            </div>
            <span class="text-primary font-mono text-sm">Unlimited</span>
          </div>
        </div>
      </div>
    </div>

    <div class="collapse collapse-plus bg-base-200 rounded-xl mb-4">
      <input type="checkbox" />
      <div class="collapse-title text-xl font-medium px-6 py-4">
        <div class="flex items-center gap-3">
          <IconifyIcon icon="heroicons:currency-dollar" class="w-6 h-6 text-accent" />
          <div class="text-left">
            <p class="text-lg font-semibold">Outcome Token Approvals</p>
            <p class="text-sm text-gray-500">Approve Outcome Token for Polymarket trading</p>
          </div>
        </div>
      </div>
      <div class="collapse-content px-6 pb-4">
        <div class="space-y-2">
          <div
            v-for="(approval, index) in outcomeTokenApprovals"
            :key="index"
            class="flex items-center justify-between bg-base-300 p-3 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span class="font-mono text-xs text-purple-400">1155</span>
              </div>
              <div>
                <p class="text-sm font-medium">{{ approval.contract }}</p>
                <p class="font-mono text-xs text-gray-500">
                  {{ approval.address.slice(0, 6) }}...{{ approval.address.slice(-4) }}
                </p>
              </div>
            </div>
            <span class="text-primary font-mono text-sm">Approved</span>
          </div>
        </div>
      </div>
    </div>

    <div class="collapse collapse-plus bg-base-200 rounded-xl mb-4">
      <input type="checkbox" />
      <div class="collapse-title text-xl font-medium px-6 py-4">
        <div class="flex items-center gap-3">
          <IconifyIcon icon="heroicons:users" class="w-6 h-6 text-primary" />
          <div class="text-left">
            <p class="text-lg font-semibold">Safe Owners</p>
            <p class="text-sm text-gray-500">Add CNC Safe owners</p>
          </div>
        </div>
      </div>
      <div class="collapse-content px-6 pb-4">
        <div class="space-y-2">
          <div
            v-for="(owner, index) in systemOwners"
            :key="index"
            class="flex items-center justify-between bg-base-300 p-3 rounded-lg"
          >
            <div>
              <p class="text-sm font-medium">{{ owner.label }}</p>
              <p class="font-mono text-xs text-gray-500">{{ owner.address }}</p>
            </div>
            <IconifyIcon icon="heroicons:check-circle" class="w-4 h-4 text-green-500" />
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-3">
          Threshold: 2 of {{ systemOwners.length }} signatures required
        </p>
      </div>
    </div>

    <!-- Batch indicator -->
    <div class="flex items-center justify-center gap-2 text-sm text-gray-500">
      <IconifyIcon icon="heroicons:cog-6-tooth" class="w-4 h-4" />
      <span>Batching 3 actions into 1 transaction</span>
    </div>

    <ButtonUI
      @click="$emit('approve-and-configure')"
      :disabled="isProcessing"
      variant="success"
      size="lg"
      class="w-full text-white"
    >
      <IconifyIcon v-if="isProcessing" icon="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
      {{ isProcessing ? 'Executing Batch Transaction...' : 'Approve & Add Owners' }}
    </ButtonUI>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'
import ButtonUI from '@/components/ButtonUI.vue'

defineProps<{ isProcessing: boolean }>()
defineEmits(['approve-and-configure'])

const systemOwners = [
  { address: '0x1234...5678', label: 'Treasury Signer' },
  { address: '0x8765...4321', label: 'Council Member 1' },
  { address: '0x9876...1234', label: 'Council Member 2' }
]

const usdcApprovals = [
  { contract: 'CTF Contract', address: '0x4d97dcd97ec945f40cf65f87097ace5ea0476045' },
  { contract: 'CTF Exchange', address: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' },
  { contract: 'Neg Risk CTF Exchange', address: '0xC5d563A36AE78145C45a50134d48A1215220f80a' },
  { contract: 'Neg Risk Adapter', address: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' }
]

const outcomeTokenApprovals = [
  { contract: 'CTF Exchange', address: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' },
  { contract: 'Neg Risk CTF Exchange', address: '0xC5d563A36AE78145C45a50134d48A1215220f80a' },
  { contract: 'Neg Risk Adapter', address: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' }
]
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
