<template>
  <div class="container mx-auto px-4 py-8 space-y-8">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          Micro Payments management
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Manage and withdraw collected fees
        </p>
      </div>
    </div>

    <!-- Stats Cards -->
    <FeeCollectorStats />

    <!-- Token Holdings Table (renders the Withdraw button + modal internally) -->
    <TokenHoldingsTable />

    <!-- Fee Config List -->
    <FeeConfigList />
  </div>
</template>
