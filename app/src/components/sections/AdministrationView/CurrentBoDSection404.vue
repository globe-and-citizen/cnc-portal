<template>
  <div class="flex flex-wrap justify-between gap-5 p-5">
    <div
      v-for="(, index) in 5"
      :key="index"
      class="flex flex-col items-center gap-4 p-4 bg-white rounded-lg shadow-sm min-w-[180px] max-w-[200px] flex-1"
    >
      <!-- Circle placeholder for avatar -->
      <div class="w-20 h-20 rounded-full bg-gray-200 animate-pulse"></div>

      <!-- Three rectangular strips -->
      <div class="w-full flex flex-col items-center gap-3">
        <div class="h-3 w-4/5 rounded bg-gray-200 animate-pulse"></div>
        <div class="h-3 w-4/5 rounded bg-gray-200 animate-pulse"></div>
        <div class="h-3 w-4/5 rounded bg-gray-200 animate-pulse"></div>
      </div>
    </div>
  </div>
  <p>There is no Current Board of Directors. <br />Create an Election to set Board of Directors</p>
</template>
