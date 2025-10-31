<template>
  <div class="flex flex-col gap-y-8">
    <InvestorsHeader />

    <div class="divider m-0"></div>
    <InvestorsActions />
    <div class="divider m-0"></div>
    <ShareholderList />
    <div class="divider m-o"></div>

    <BankDividendsSection />
    <div class="divider m-0"></div>
    <PayDividendsTable />
    <div class="divider m-0"></div>
    <InvestorsTransactions />
  </div>
</template>

<script setup lang="ts">
import InvestorsHeader from '@/components/sections/SherTokenView/InvestorsHeader.vue'
import InvestorsActions from '@/components/sections/SherTokenView/InvestorsActions.vue'
import ShareholderList from '@/components/sections/SherTokenView/ShareholderList.vue'
import InvestorsTransactions from '@/components/sections/SherTokenView/InvestorsTransactions.vue'
import PayDividendsTable from '@/components/sections/SherTokenView/PayDividendsTable.vue'
import BankDividendsSection from '@/components/sections/SherTokenView/DividendsBalancesSection.vue'
</script>
