<template>
  <div id="bank-transactions">
    <SkeletonLoading v-if="depositEventLoading" class="w-full h-52" />
    <h2>Deposit History</h2>
    <div v-if="!depositEventLoading">
      <table class="table table-zebra">
        <TableHead class="font-bold text-lg" :columns="depositColumns" />
        <TableBody :tableData="depositEvents" />
        <!-- <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Job</th>
            <th>Favorite Color</th>
          </tr>
        </thead> -->
      </table>
    </div>/
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'

// Components
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import TableHead from '@/components/TableHead.vue'
import { useBankEvents } from '@/composables/bank'
import { useToastStore } from '@/stores/useToastStore'
import { BankEventType } from '@/types'
import TableBody from '@/components/TableBody.vue'
import { log } from '@/utils'

const props = defineProps<{
  bankAddress: string
}>()
const emits = defineEmits(['fetchTransactions'])
const depositColumns = ['Tx Hash', 'Depositor', 'Amount']

const {
  getEvents: getDepositEvents,
  error: depositEventError,
  events: depositEvents,
  loading: depositEventLoading
} = useBankEvents(props.bankAddress)
const { addErrorToast } = useToastStore()

watch(depositEventError, () => {
  if (depositEventError.value) {
    addErrorToast(
      depositEventError.value.reason
        ? depositEventError.value.reason
        : 'Failed to get deposit events'
    )
  }
})

onMounted(async () => {
  log.info('test')
  await getDepositEvents(BankEventType.Deposit)
})
</script>
