<template>
  <div class="flex flex-col gap-y-8">
    <!-- TODO move it to the top of the page when cash remuneration will have his own page -->
    <!-- Cash Remuneration stats: Only apear for owner -->
    <ExpenseStatsSection />

    <GenericTokenHoldingsSection
      v-if="team?.expenseAccountEip712Address"
      :address="team.expenseAccountEip712Address"
    />

    <MyApprovedExpenseSection
      v-if="team"
      :team="team"
      :is-disapproved-address="isDisapprovedAddress"
      v-model="reload"
    />

    <ApprovedExpensesSection />

    <div data-test="claims-table">
      <TransactionHistorySection
        :currency-rates="{
          loading: false,
          error: null,
          getRate: () => 1
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
//#region Imports
import { computed, onMounted, ref, watch } from 'vue'
import type { Team } from '@/types'
import ExpenseStatsSection from '@/components/sections/ExpenseAccountView/ExpenseStatsSection.vue'
import TransactionHistorySection from '@/components/sections/ExpenseAccountView/TransactionHistorySection.vue'
import MyApprovedExpenseSection from '@/components/sections/ExpenseAccountView/MyApprovedExpenseSection.vue'
import ApprovedExpensesSection from '@/components/sections/ExpenseAccountView/ApprovedExpensesSection.vue'
import { useUserDataStore } from '@/stores'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useRoute } from 'vue-router'
import { useExpenseAccountDataCollection } from '@/composables'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'
//#endregion

//#region Refs
const route = useRoute()
const reload = ref(false)
// Check if the current user is disapproved
const isDisapprovedAddress = computed(
  () =>
    manyExpenseAccountDataAll.findIndex(
      (item) =>
        item.approvedAddress === currentUserAddress &&
        (item.status === 'disabled' || item.status === 'expired')
    ) !== -1
)
//#endregion

//#region useCustomFetch
const {
  data: team,
  // error: teamError,
  execute: executeFetchTeam
} = useCustomFetch(`teams/${String(route.params.id)}`)
  .get()
  .json<Team>()
//#endregion

//#region Composables
const currentUserAddress = useUserDataStore().address
const { data: manyExpenseAccountDataAll, initializeBalances } = useExpenseAccountDataCollection()
//#endregion

//#region Functions
const init = async () => {
  await executeFetchTeam()
  await initializeBalances()
}
//#endregion

//#region Watch
watch(reload, async (newState) => {
  if (newState) {
    await init()
  }
})
watch(
  () => team.value?.expenseAccountAddress,
  async (newVal) => {
    if (newVal) await init()
  }
)
//#endregion

onMounted(async () => {
  await init()
})
</script>
