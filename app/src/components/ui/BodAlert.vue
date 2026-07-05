<template>
  <div
    class="flex items-start gap-3 rounded-md border border-blue-300 bg-blue-50 p-4 text-blue-800"
  >
    <!-- Icon (optional) -->
    <svg
      class="mt-1 h-5 w-5 shrink-0 text-blue-500"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
      ></path>
    </svg>

    <!-- Message -->
    <div>
      <p class="font-semibold">Info</p>
      <p class="text-sm">
        This will create a BOD action which requires approval from at least half of the BOD members.
      </p>
    </div>
  </div>
</template>
