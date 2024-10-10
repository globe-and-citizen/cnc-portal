<template>
  <div class="flex flex-col gap-8 mt-12">
    <PushTipTransactionsTable />
    <SendTipTransactonsTable />
    <TipWithdrawalTransactionsTable />
  </div>
</template>

<script setup lang="ts">
import PushTipTransactionsTable from '@/components/sections/TransactionsView/tables/PushTipTransactionsTable.vue'
import SendTipTransactonsTable from '@/components/sections/TransactionsView/tables/SendTipTransactonsTable.vue'
import TipWithdrawalTransactionsTable from '@/components/sections/TransactionsView/tables/TipWithdrawalTransactionsTable.vue'
</script>
