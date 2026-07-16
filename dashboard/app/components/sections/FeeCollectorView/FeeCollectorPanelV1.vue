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
// V1 (current) management panel. Its child components import the default
// (unversioned) FeeCollector composables, which resolve to V1.
import FeeCollectorStats from './FeeCollectorStats.vue'
import TokenHoldingsTable from './TokenHoldingsTable.vue'
import FeeConfigList from './FeeConfigList.vue'
</script>
