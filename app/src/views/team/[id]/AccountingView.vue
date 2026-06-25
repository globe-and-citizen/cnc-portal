<template>
  <div class="flex flex-col gap-5">
    <AccountingHeader @export="onExport" />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AccountingHeader from '@/components/sections/AccountingView/AccountingHeader.vue'
import { exportAccountingExcel } from '@/utils/accountingExport'
import { log } from '@/utils'

const toast = useToast()

async function onExport() {
  try {
    await exportAccountingExcel()
    toast.add({ title: 'Accounting books exported to Excel', color: 'success' })
  } catch (error) {
    log.error('Accounting export failed', error)
    toast.add({ title: 'Export failed', color: 'error' })
  }
}
</script>
