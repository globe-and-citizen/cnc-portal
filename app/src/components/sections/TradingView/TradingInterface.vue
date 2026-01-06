<template>
  <div class="space-y-8 animate-fade-in">
    <TradingStats />
    <YourTradesSection />
  </div>
</template>

<script setup lang="ts">
import YourTradesSection from './YourTradesSection.vue'
import TradingStats from './TradingStats.vue'
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}
</style>
