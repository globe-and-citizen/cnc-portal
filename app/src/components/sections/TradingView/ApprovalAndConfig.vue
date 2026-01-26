<template>
  <div class="space-y-6 animate-fade-in">
    <ApprovalItemCard
      :approval-items="usdcApprovals"
      icon="heroicons:currency-dollar"
      title="USDC.e Approvals"
      description="Approve USDC for Polymarket trading"
      symbol="USDC"
      color="primary"
      value="Unlimited"
    />

    <ApprovalItemCard
      :approval-items="outcomeTokenApprovals"
      icon="heroicons:currency-dollar"
      title="Outcome Token Approvals"
      description="Approve Outcome Token for Polymarket trading"
      symbol="1155"
      color="info"
      value="Approved"
    />

    <ApprovalItemCard
      :approval-items="systemOwners"
      icon="heroicons:users"
      title="Safe Owners"
      description="Add CNC Safe owners"
      color="primary"
      :isIcon="true"
      value="heroicons:check-circle"
    />

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
import ApprovalItemCard from './ApprovalItemCard.vue'
import { useTeamStore } from '@/stores'
import { computed } from 'vue'
import { getAddress } from 'viem'

defineProps<{ isProcessing: boolean }>()
defineEmits(['approve-and-configure'])

const teamStore = useTeamStore()
const systemOwners = computed(() => {
  const teamData = teamStore.currentTeamMeta.data
  const bankSafe = teamData?.safeAddress ? getAddress(teamData?.safeAddress) : undefined
  const ownerAddress = teamData?.ownerAddress ? getAddress(teamData?.ownerAddress) : undefined
  return bankSafe && ownerAddress
    ? [
        { address: bankSafe, name: 'Bank Safe' },
        {
          address: ownerAddress,
          name:
            teamData?.members.find(
              (m) => m.address.toLocaleLowerCase() === teamData?.ownerAddress.toLocaleLowerCase()
            )?.name || 'Team Owner'
        }
      ]
    : []
})

const usdcApprovals = [
  { name: 'CTF Contract', address: '0x4d97dcd97ec945f40cf65f87097ace5ea0476045' },
  { name: 'CTF Exchange', address: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' },
  { name: 'Neg Risk CTF Exchange', address: '0xC5d563A36AE78145C45a50134d48A1215220f80a' },
  { name: 'Neg Risk Adapter', address: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' }
]

const outcomeTokenApprovals = [
  { name: 'CTF Exchange', address: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' },
  { name: 'Neg Risk CTF Exchange', address: '0xC5d563A36AE78145C45a50134d48A1215220f80a' },
  { name: 'Neg Risk Adapter', address: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' }
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
