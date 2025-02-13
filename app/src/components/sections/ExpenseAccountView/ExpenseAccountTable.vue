<template>
  <div class="form-control flex flex-row gap-1">
    <label class="label cursor-pointer flex gap-2" :key="status" v-for="status in statuses">
      <span class="label-text">{{ status.charAt(0).toUpperCase() + status.slice(1) }}</span>
      <input
        type="radio"
        name="pending"
        class="radio checked:bg-primary"
        :data-test="`status-input-${status}`"
        :id="status"
        :value="status"
        v-model="selectedRadio"
      />
    </label>
  </div>
  <div class="card bg-base-100 w-full shadow-xl">
    <TableComponent :rows="filteredApprovals" :columns="columns">
      <template #action-data="{ row }">
        <ButtonUI
          v-if="row.status == 'enabled'"
          variant="error"
          data-test="disable-button"
          :loading="loading && signatureToUpdate === row.signature"
          @click="
            () => {
              emits('disableApproval', row.signature)
              signatureToUpdate = row.signature
            }
          "
          >Disable</ButtonUI
        >
        <ButtonUI
          v-if="row.status == 'disabled'"
          variant="info"
          data-test="enable-button"
          :loading="loading && signatureToUpdate === row.signature"
          @click="
            () => {
              emits('enableApproval', row.signature)
              signatureToUpdate = row.signature
            }
          "
          >Enable</ButtonUI
        >
      </template>
      <template #member-data="{ row }">
        <div class="flex w-full gap-2">
          <div class="w-8 sm:w-10">
            <img
              alt="User avatar"
              class="rounded-full"
              src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
            />
          </div>
          <div class="flex flex-col text-gray-600">
            <p class="font-bold text-sm line-clamp-1" data-test="user-name">{{ row.name }}</p>
            <p class="text-sm" data-test="formatted-address">
              {{ row.approvedAddress?.slice(0, 6) }}...{{ row.approvedAddress?.slice(-4) }}
            </p>
          </div>
        </div>
      </template>
      <template #expiryDate-data="{ row }">
        <span>{{ row.expiry }}</span>
      </template>
      <template #status-data="{ row }">
        <span
          class="badge"
          :class="{
            'badge-success': row.status === 'enabled',
            'badge-info': row.status === 'disabled',
            'badge-error': row.status === 'expired'
          }"
          >{{ row.status }}</span
        >
      </template>
      <template #maxAmountPerTx-data="{ row }">
        <span>{{ row.budgetData[2].value }}</span>
      </template>
      <template #transactions-data="{ row }">
        <span>{{ row.balances[0] }}/{{ row.budgetData[0].value }}</span>
      </template>
      <template #amountTransferred-data="{ row }">
        <span>{{ row.balances[1] }}/{{ row.budgetData[1].value }}</span>
      </template>
    </TableComponent>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { computed, ref, type Reactive } from 'vue'
import type { ManyExpenseWithBalances } from '@/types'

const { approvals, loading } = defineProps<{
  approvals: Reactive<ManyExpenseWithBalances[]>
  loading: boolean
}>()
const emits = defineEmits(['disableApproval', 'enableApproval'])
const statuses = ['all', 'disabled', 'enabled', 'expired']
const selectedRadio = ref('all')
const signatureToUpdate = ref('')
// const approvals = ref([
//   {
//     approvedAddress: '0x1234567890123456789012345678901234567890',
//     tokenAddress: USDC_ADDRESS,
//     budgetData: [
//       { budgetType: 0, value: `10` },
//       { budgetType: 1, value: `100` },
//       { budgetType: 2, value: `10` }
//     ],
//     expiry: new Date().toLocaleDateString('en-US'),
//     signature: `0xSignature`,
//     name: `Some One`,
//     avatarUrl: null,
//     balances: {
//       0: `5`,
//       1: `50`
//     },
//     status: 'enabled'
//   },
//   {
//     approvedAddress: '0x1234567890123456789012345678901234567890',
//     tokenAddress: USDC_ADDRESS,
//     budgetData: [
//       { budgetType: 0, value: `10` },
//       { budgetType: 1, value: `100` },
//       { budgetType: 2, value: `10` }
//     ],
//     expiry: new Date().toLocaleDateString('en-US'),
//     signature: `0xSignature`,
//     name: `Another One`,
//     avatarUrl: null,
//     balances: {
//       0: `5`,
//       1: `50`
//     },
//     status: 'disabled'
//   },
//   {
//     approvedAddress: '0x1234567890123456789012345678901234567890',
//     tokenAddress: USDC_ADDRESS,
//     budgetData: [
//       { budgetType: 0, value: `10` },
//       { budgetType: 1, value: `100` },
//       { budgetType: 2, value: `10` }
//     ],
//     expiry: new Date().toLocaleDateString('en-US'),
//     signature: `0xSignature`,
//     name: `Another One`,
//     avatarUrl: null,
//     balances: {
//       0: `5`,
//       1: `50`
//     },
//     status: 'expired'
//   }
// ])

const filteredApprovals = computed(() => {
  if (selectedRadio.value === 'all') {
    return approvals
  } else {
    return approvals.filter((approval) => approval.status === selectedRadio.value)
  }
})

// const filteredApprovals = computed(() => {
//   if (selectedRadio.value === 'all') {
//     return approvals.value;
//   } else {
//     return approvals.value.filter(approval => approval.status === selectedRadio.value);
//   }
// });

const columns = [
  {
    key: 'member',
    label: 'Member',
    sortable: false
  },
  {
    key: 'expiryDate',
    label: 'Expiry',
    sortable: true
  },
  {
    key: 'maxAmountPerTx',
    label: 'Max Ammount Per Tx',
    sortable: false
  },
  {
    key: 'transactions',
    label: 'Total Transactions',
    sortable: false
  },
  {
    key: 'amountTransferred',
    label: 'Amount Transferred',
    sortable: false
  },
  {
    key: 'status',
    label: 'Status'
  },
  {
    key: 'action',
    label: 'Action',
    sortable: false
  }
] as TableColumn[]
</script>
