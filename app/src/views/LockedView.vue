<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center">
    <div class="max-w-md p-6 bg-white rounded-2xl shadow-lg">
      <h1 class="text-2xl font-bold text-red-500 mb-3">🔒 Session Locked</h1>
      <p class="text-gray-600 mb-4">You already have this application open in another tab.</p>
      <p class="text-sm text-gray-500 mb-6">
        Close the other tab to continue.<br />
        <span class="text-blue-600 font-medium">Waiting for unlock...</span>
      </p>
    </div>

    <p class="mt-6 text-xs text-gray-400">
      This page will automatically unlock once the other tab is closed.
    </p>
  </div>
</template>
