<template>
  <div class="flex flex-col gap-5">
    <AccountingHeader @export="onExport" @print="onPrint" />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="Couldn't load the accounting data"
      description="Some on-chain or backend sources failed to load. Figures may be incomplete."
      data-test="accounting-error"
    />

    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AccountingHeader from '@/components/sections/AccountingView/AccountingHeader.vue'
import { provideAccounting } from '@/composables/accounting/useAccountingContext'
import { exportAccountingExcel } from '@/utils/accountingExport'
import { exportAccountingPdf } from '@/utils/accountingPdf'
import { resolveUser } from '@/utils/transactionHistoryUtil'
import { log } from '@/utils'

const route = useRoute()
const toast = useToast()

// Resolve a ledger party's address to its member/contract display name for the
// "Activity" column, mirroring what the on-screen ledger shows via avatars.
const resolveName = (address: string) => resolveUser(address).name

// Resolve the team's books once and share them with the child cards.
const accounting = provideAccounting(() => (route.params.id as string) ?? null)
const error = computed(() => accounting.error.value)

async function onExport() {
  try {
    await exportAccountingExcel(
      {
        entries: accounting.entries.value,
        summary: accounting.summary.value,
        generalLedger: accounting.generalLedger.value,
        incomeStatement: accounting.incomeStatement.value,
        balanceSheet: accounting.balanceSheet.value
      },
      resolveName
    )
    toast.add({ title: 'Accounting books exported to Excel', color: 'success' })
  } catch (error) {
    log.error('Accounting export failed', error)
    toast.add({ title: 'Export failed', color: 'error' })
  }
}

async function onPrint() {
  try {
    await exportAccountingPdf(
      {
        entries: accounting.entries.value,
        summary: accounting.summary.value,
        generalLedger: accounting.generalLedger.value,
        incomeStatement: accounting.incomeStatement.value,
        balanceSheet: accounting.balanceSheet.value
      },
      resolveName
    )
    toast.add({ title: 'Accounting books printed to PDF', color: 'success' })
  } catch (error) {
    log.error('Accounting PDF export failed', error)
    toast.add({ title: 'PDF export failed', color: 'error' })
  }
}
</script>
