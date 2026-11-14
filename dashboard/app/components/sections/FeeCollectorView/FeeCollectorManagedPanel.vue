<template>
  <div class="space-y-8">
    <!-- Stats Cards -->
    <FeeCollectorStats />

    <!-- Token Holdings Table (renders the Withdraw button + modal internally) -->
    <TokenHoldingsTable />

    <!-- Fee Config List -->
    <FeeConfigList />
  </div>
</template>

<script setup lang="ts">
// Shared management panel for V1 and V2. The keyed route remounts its children
// on version changes so each composable captures the correct deployment.
import FeeCollectorStats from './FeeCollectorStats.vue'
import TokenHoldingsTable from './TokenHoldingsTable.vue'
import FeeConfigList from './FeeConfigList.vue'
</script>
