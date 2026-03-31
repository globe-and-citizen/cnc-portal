<template>
  <div class="flex flex-wrap justify-between gap-5 p-5">
    <div
      v-for="(_, index) in 5"
      :key="index"
      class="flex max-w-[200px] min-w-[180px] flex-1 flex-col items-center gap-4 rounded-lg bg-white p-4 shadow-xs"
    >
      <!-- Circle placeholder for avatar -->
      <div class="h-20 w-20 animate-pulse rounded-full bg-gray-200"></div>

      <!-- Three rectangular strips -->
      <div class="flex w-full flex-col items-center gap-3">
        <div class="h-3 w-4/5 animate-pulse rounded-sm bg-gray-200"></div>
        <div class="h-3 w-4/5 animate-pulse rounded-sm bg-gray-200"></div>
        <div class="h-3 w-4/5 animate-pulse rounded-sm bg-gray-200"></div>
      </div>
    </div>
  </div>
  <p>There is no Current Board of Directors. <br />Create an Election to set Board of Directors</p>
</template>
