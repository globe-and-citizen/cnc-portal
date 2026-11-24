<template>
  <WeeklyClaim />
  <CashRemunerationTransactions
    v-if="cashRemunerationAddress"
    :cash-remuneration-address="cashRemunerationAddress"
  />
</template>

<script setup lang="ts">
import CashRemunerationTransactions from '@/components/sections/CashRemunerationView/CashRemunerationTransactions.vue'
import WeeklyClaim from '@/components/sections/WeeklyClaimView/WeeklyClaim.vue'
import { computed } from 'vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const cashRemunerationAddress = computed(() =>
  teamStore.getContractAddressByType('CashRemunerationEIP712')
)
</script>
