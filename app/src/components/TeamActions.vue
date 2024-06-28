<template>
  <div class="flex justify-end">
    <button
      class="btn btn-primary"
      @click="emits('createBank')"
      v-if="!team.bankAddress"
      data-test="createBank"
    >
      Create Bank Account Smart Contract
    </button>
    <div class="flex gap-2">
      <button
        class="btn btn-primary"
        @click="emits('deposit')"
        v-if="team.bankAddress"
        data-test="deposit"
      >
        Deposit
      </button>
      <button
        class="btn btn-primary"
        @click="emits('transfer')"
        v-if="team.bankAddress"
        data-test="transfer"
      >
        Transfer
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Team } from '@/types'

const emits = defineEmits(['deposit', 'transfer', 'createBank'])
defineProps<{
  team: Partial<Team>
}>()
</script>
