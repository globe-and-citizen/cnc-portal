<template>
  <div id="bank-transactions" class="flex flex-col gap-24">
    <DepositHistory :depositEvents="depositEvents" :depositEventLoading="depositEventLoading" />
    <TransferHistory
      :transferEvents="transferEvents"
      :transferEventLoading="transferEventLoading"
    />
    <TipsAddressChangedHistory
      :tipsAddressChangedEvents="tipsAddressChangedEvents"
      :tipsAddressChangedEventLoading="tipsAddressChangedEventLoading"
    />
    <SendToWalletHistory
      :sendToWalletEvents="sendToWalletEvents"
      :sendToWalletEventLoading="sendToWalletEventLoading"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import DepositHistory from '@/components/bank-history/DepositHistory.vue'
import TransferHistory from '@/components/bank-history/TransferHistory.vue'
import TipsAddressChangedHistory from '@/components/bank-history/TipsAddressChangedHistory.vue'
import SendToWalletHistory from '@/components/bank-history/SendToWalletHistory.vue'
import type { EventResult } from '@/types'

defineProps<{
  depositEvents: EventResult[]
  depositEventLoading: boolean
  transferEvents: EventResult[]
  transferEventLoading: boolean
  tipsAddressChangedEvents: EventResult[]
  tipsAddressChangedEventLoading: boolean
  sendToWalletEvents: EventResult[]
  sendToWalletEventLoading: boolean
}>()
const emits = defineEmits([
  'getDepositEvents',
  'getTransferEvents',
  'getTipsAddressChangedEvents',
  'getSendToWalletEvents'
])

onMounted(() => {
  emits('getDepositEvents')
  emits('getTransferEvents')
  emits('getTipsAddressChangedEvents')
  emits('getSendToWalletEvents')
})
</script>
