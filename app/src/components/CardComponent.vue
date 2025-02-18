<template>
  <div class="card bg-base-100 shadow-lg">
    <div class="card-body">
      <div class="flex justify-between items-center">
        <span class="card-title">Card Title</span>
        <div class="card-actions justify-end">
          <ButtonUI variant="primary">Card Action Button</ButtonUI>
        </div>
      </div>
      <div class="card-content">Lorem Ipsum</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import ButtonUI from './ButtonUI.vue'
</script>

<style scoped>
</style>
