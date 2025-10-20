<template>
  <div class="bank-admin-operations bg-white p-6 rounded-lg border border-gray-200">
    <h3 class="text-lg font-semibold mb-4">Admin Operations</h3>

    <!-- Pause/Unpause Contract -->
    <BankPauseOperation />

    <!-- Change Tips Address -->
    <!-- <BankChangeTipsAddressOperation /> -->

    <!-- Transfer Ownership -->
    <BankTransferOwnershipOperation />
  </div>
</template>

<script setup lang="ts">
import BankPauseOperation from '@/components/examples/admin/BankPauseOperation.vue'
// import BankChangeTipsAddressOperation from '@/components/examples/admin/BankChangeTipsAddressOperation.vue'
import BankTransferOwnershipOperation from '@/components/examples/admin/BankTransferOwnershipOperation.vue'
</script>
