<template>
  <div class="flex-1 space-y-6">
    <div class="stats shadow w-full">
      <div class="stat place-items-center">
        <div class="stat-title">Total Hours</div>
        <div class="stat-value">{{ totalHours }}h</div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Hourly Rate</div>
        <div class="stat-value text-secondary">{{ hourlyRate }}$</div>
        <div class="stat-desc">10 USDC, 10 POL, 10 SHER</div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Total Amount</div>
        <div class="stat-value">{{ totalAmount }}$</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
