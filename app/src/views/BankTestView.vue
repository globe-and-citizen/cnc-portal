<template>
  <div class="bank-test-view">
    <div class="container mx-auto p-6">
      <h1 class="text-3xl font-bold mb-6">Bank Contract Testing</h1>
      <p class="text-gray-600 mb-8">
        This page allows you to experiment with the Bank contract functionality using the enhanced
        Bank composable.
      </p>

      <!-- Bank Example Component -->
      <BankExample />
    </div>
  </div>
</template>

<script setup lang="ts">
import BankExample from '@/components/examples/BankExample.vue'
</script>

<style scoped>
.bank-test-view {
  min-height: 100vh;
  background-color: #f9fafb;
}
</style>
