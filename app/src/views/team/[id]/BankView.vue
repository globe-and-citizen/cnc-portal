<template>
  <div>
    <div>
      <div>
        <BankBalanceSection
          v-if="teamStore.currentTeam"
          ref="bankBalanceSection"
          :bank-address="typedBankAddress"
          @balance-updated="$forceUpdate()"
        />
      </div>

      <TokenHoldingsSection :bank-balance-section="bankBalanceSection" />
      <TransactionsHistorySection />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { type Address } from 'viem'
import BankBalanceSection from '@/components/sections/BankView/BankBalanceSection.vue'
import TokenHoldingsSection from '@/components/sections/BankView/TokenHoldingsSection.vue'
import TransactionsHistorySection from '@/components/sections/BankView/TransactionsHistorySection.vue'
import { useTeamStore } from '@/stores'

const teamStore = useTeamStore()
const typedBankAddress = computed(() => teamStore.currentTeam?.bankAddress as Address | undefined)
const bankBalanceSection = ref()
</script>
