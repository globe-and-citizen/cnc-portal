<template>
  <div class="flex flex-col md:flex-row gap-8 w-full my-5">
    <div
      v-for="(, index) in 3"
      :key="index"
      class="flex-1 min-w-[300px] p-6 border border-gray-200 rounded-2xl"
    >
      <!-- Row 1: 1/2 | 1/4 -->
      <div class="flex justify-between mb-6">
        <div class="w-1/2 h-6 rounded-lg bg-gray-200 animate-pulse"></div>
        <div class="w-1/4 h-6 rounded-lg bg-gray-200 animate-pulse"></div>
      </div>

      <!-- Row 2: 2/3 -->
      <div class="w-2/3 h-6 rounded-lg bg-gray-200 animate-pulse mb-6"></div>

      <!-- Row 3: 2/5 | 1/5 -->
      <div class="flex justify-between mb-6">
        <div class="w-2/5 h-6 rounded-lg bg-gray-200 animate-pulse"></div>
        <div class="w-1/5 h-6 rounded-lg bg-gray-200 animate-pulse"></div>
      </div>

      <!-- Row 4: 2/5 | 1/5 -->
      <div class="flex justify-between mb-6">
        <div class="w-2/5 h-6 rounded-lg bg-gray-200 animate-pulse"></div>
        <div class="w-1/5 h-6 rounded-lg bg-gray-200 animate-pulse"></div>
      </div>

      <!-- Horizontal Line -->
      <div class="border-t border-gray-200 my-6"></div>

      <!-- Row 5: 2/3 -->
      <div class="w-2/3 h-6 rounded-lg bg-gray-200 animate-pulse mb-6"></div>

      <!-- Row 6: 1/5 | 1/5 | 1/5 -->
      <div class="flex justify-between mb-8">
        <div class="w-1/5 h-6 rounded-lg bg-gray-200 animate-pulse"></div>
        <div class="w-1/5 h-6 rounded-lg bg-gray-200 animate-pulse"></div>
        <div class="w-1/5 h-6 rounded-lg bg-gray-200 animate-pulse"></div>
      </div>

      <!-- Full-width button placeholder -->
      <div class="w-full h-10 rounded-lg bg-gray-200 animate-pulse"></div>
    </div>
  </div>
  <p>There are no Past Elections. <br />Create and publish an Election to view Past Elections</p>
</template>
