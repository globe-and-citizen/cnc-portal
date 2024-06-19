<template>
  <div class="flex justify-end">
    <button class="btn btn-primary btn" @click="emits('createContract')" v-if="!team.bankAddress">
      Create Bank Account Smart Contract
    </button>
    <div class="flex gap-2">
      <button class="btn btn-primary" @click="emits('deposit')" v-if="team.bankAddress">
        Deposit
      </button>
      <button class="btn btn-primary" @click="emits('transfer')" v-if="team.bankAddress">
        Transfer
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Team } from '@/types'

const emits = defineEmits(['deposit', 'transfer', 'createContract'])
defineProps<{
  team: Partial<Team>
}>()
</script>
