<template>
  <!-- TODO move it to the top of the page when cash remuneration will have his own page -->
  <!-- Cash Remuneration stats: Only apear for owner -->
  <div class="flex gap-10">
    <div class="card bg-base-200 w-1/3 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Balance</h2>
        <div class="font-extrabold text-neutral flex gap-2 items-baseline">
          <span class="inline-block h-10 text-4xl">
            <span class="loading loading-spinner loading-lg" v-if="false"></span>
            <span v-else>1000 </span>
          </span>
          <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
        </div>
      </div>
    </div>
    <div class="card bg-blue-100 text-blue-800 w-1/3 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Mount Claims withdrawed</h2>
        <div class="font-extrabold flex gap-2 items-baseline">
          <span class="inline-block h-10 text-4xl">
            <span class="loading loading-spinner loading-lg" v-if="false"></span>
            <span v-else>10 </span>
          </span>
          <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
        </div>
      </div>
    </div>
    <div class="card bg-orange-200 text-orange-800 w-1/3 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Approved Claims</h2>
        <div class="font-extrabold flex gap-2 items-baseline">
          <span class="inline-block h-10 text-4xl">
            <span class="loading loading-spinner loading-lg" v-if="false"></span>
            <span v-else>20 </span>
          </span>
          <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { NETWORK } from '@/constant'
</script>
