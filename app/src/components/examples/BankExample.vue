<template>
  <div class="bank-example p-6 space-y-6">
    <h2 class="text-2xl font-bold">Bank Contract Example</h2>
    <p class="text-gray-600">
      This example demonstrates the Bank contract functionality with organized components for each
      operation type.
    </p>

    <!-- Read Operations -->
    <BankReadOperations />

    <!-- Admin Operations -->
    <BankAdminOperations />

    <!-- Transfer Operations -->
    <BankTransferOperations />
  </div>
</template>

<script setup lang="ts">
import BankReadOperations from '@/components/examples/BankReadOperations.vue'
import BankAdminOperations from '@/components/examples/BankAdminOperations.vue'
import BankTransferOperations from '@/components/examples/BankTransferOperations.vue'
</script>

<style scoped>
.bank-example {
  min-height: 100vh;
  background-color: #f9fafb;
}
</style>
