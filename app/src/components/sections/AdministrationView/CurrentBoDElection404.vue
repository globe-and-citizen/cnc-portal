<template>
  <div class="flex flex-col gap-6 w-full mt-4">
    <!-- Main rectangular placeholder (half width) -->
    <div class="w-full md:w-1/2 h-24 rounded-xl bg-gray-200 animate-pulse"></div>

    <!-- Four horizontal tiles -->
    <div class="flex flex-wrap gap-6 w-full">
      <div
        v-for="(_, index) in 4"
        :key="index"
        class="h-24 flex-1 min-w-[150px] rounded-xl bg-gray-200 animate-pulse"
      ></div>
    </div>
    <p>There is no Current Election. <br />Create an Election to view the Current Election</p>
  </div>
</template>
