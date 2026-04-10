<template>
  <div class="my-5 flex w-full flex-col gap-8 md:flex-row">
    <div
      v-for="(_, index) in 3"
      :key="index"
      class="min-w-[300px] flex-1 rounded-2xl border border-gray-200 p-6"
    >
      <!-- Row 1: 1/2 | 1/4 -->
      <div class="mb-6 flex justify-between">
        <div class="h-6 w-1/2 rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
        <div class="h-6 w-1/4 rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
      </div>

      <!-- Row 2: 2/3 -->
      <div
        class="mb-6 h-6 w-2/3 rounded-lg bg-gray-200"
        :class="{ isLoading: 'animate-pulse' }"
      ></div>

      <!-- Row 3: 2/5 | 1/5 -->
      <div class="mb-6 flex justify-between">
        <div class="h-6 w-2/5 rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
        <div class="h-6 w-1/5 rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
      </div>

      <!-- Row 4: 2/5 | 1/5 -->
      <div class="mb-6 flex justify-between">
        <div class="h-6 w-2/5 rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
        <div class="h-6 w-1/5 rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
      </div>

      <!-- Horizontal Line -->
      <div class="my-6 border-t border-gray-200"></div>

      <!-- Row 5: 2/3 -->
      <div class="mb-6 h-6 w-2/3 animate-pulse rounded-lg bg-gray-200"></div>

      <!-- Row 6: 1/5 | 1/5 | 1/5 -->
      <div class="mb-8 flex justify-between">
        <div class="h-6 w-1/5 rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
        <div class="h-6 w-1/5 rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
        <div class="h-6 w-1/5 rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
      </div>

      <!-- Full-width button placeholder -->
      <div class="h-10 w-full rounded-lg bg-gray-200" :class="{ isLoading: 'animate-pulse' }"></div>
    </div>
  </div>
  <p>There are no Past Elections. <br />Create and publish an Election to view Past Elections</p>
</template>
<script setup lang="ts">
defineProps<{ isLoading: boolean }>()
</script>
