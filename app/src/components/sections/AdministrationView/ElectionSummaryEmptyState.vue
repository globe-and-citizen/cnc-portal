<template>
  <div class="mt-4 flex w-full flex-col gap-6">
    <!-- Main rectangular placeholder (half width) -->
    <div class="h-24 w-full animate-pulse rounded-xl bg-gray-200 md:w-1/2"></div>

    <!-- Four horizontal tiles -->
    <div class="flex w-full flex-wrap gap-6">
      <div
        v-for="(_, index) in 4"
        :key="index"
        class="h-24 min-w-[150px] flex-1 animate-pulse rounded-xl bg-gray-200"
      ></div>
    </div>
    <p>There is no Current Election. <br />Create an Election to view the Current Election</p>
  </div>
</template>
