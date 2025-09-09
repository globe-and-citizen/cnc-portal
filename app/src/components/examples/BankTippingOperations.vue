<template>
  <div class="bank-tipping-operations bg-white p-6 rounded-lg border border-gray-200">
    <h3 class="text-lg font-semibold mb-4">Tipping Operations</h3>

    <!-- ETH Tip -->
    <BankEthTipOperation />

    <!-- Token Tip -->
    <BankTokenTipOperation />
  </div>
</template>

<script setup lang="ts">
import BankEthTipOperation from '@/components/examples/tipping/BankEthTipOperation.vue'
import BankTokenTipOperation from '@/components/examples/tipping/BankTokenTipOperation.vue'
</script>
