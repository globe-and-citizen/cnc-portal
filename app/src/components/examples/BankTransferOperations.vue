<template>
  <div class="bank-transfer-operations bg-white p-6 rounded-lg border border-gray-200">
    <h3 class="text-lg font-semibold mb-4">Transfer Operations</h3>
    
    <!-- ETH Transfer -->
    <BankEthTransferOperation />
    
    <!-- Token Transfer -->
    <BankTokenTransferOperation />
  </div>
</template>

<script setup lang="ts">
import BankEthTransferOperation from '@/components/examples/transfers/BankEthTransferOperation.vue'
import BankTokenTransferOperation from '@/components/examples/transfers/BankTokenTransferOperation.vue'
</script>
