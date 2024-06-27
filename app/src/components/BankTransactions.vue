<template>
  <div id="bank-transactions" class="flex flex-col gap-24">
    <DepositHistory :bank-address="bankAddress" />
    <TransferHistory :bank-address="bankAddress" />
    <TipsAddressChangedHistory :bank-address="bankAddress" />
    <SendToWalletHistory :bank-address="bankAddress" />
  </div>
</template>

<script setup lang="ts">
import DepositHistory from '@/components/bank-history/DepositHistory.vue'
import TransferHistory from '@/components/bank-history/TransferHistory.vue'
import TipsAddressChangedHistory from '@/components/bank-history/TipsAddressChangedHistory.vue'
import SendToWalletHistory from '@/components/bank-history/SendToWalletHistory.vue'
import { onMounted } from 'vue';
import { log } from '@/utils';

const props = defineProps<{
  bankAddress: string
}>()
onMounted(() => {
  log.info('bankAddress: ', props.bankAddress)
})
</script>
