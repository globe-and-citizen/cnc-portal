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
  <div class="card bg-base-100 w-full">
    <TableComponent :rows="filteredApprovals" :columns="columns">
      <template #action-data="{ row }">
        <ButtonUI
          v-if="row.status == 'enabled'"
          variant="error"
          data-test="disable-button"
          size="sm"
          :loading="loading && signatureToUpdate === row.signature"
          :disabled="!isContractOwner"
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
          size="sm"
          :loading="loading && signatureToUpdate === row.signature"
          :disabled="!isContractOwner"
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
        <span>{{ new Date(Number(row.expiry) * 1000).toLocaleString('en-US') }}</span>
      </template>
      <template #status-data="{ row }">
        <span
          class="badge"
          :class="{
            'badge-success badge-outline': row.status === 'enabled',
            'badge-info badge-outline': row.status === 'disabled',
            'badge-error badge-outline': row.status === 'expired'
          }"
          >{{ row.status }}</span
        >
      </template>
      <template #maxAmountPerTx-data="{ row }">
        <span>{{ row.budgetData[2].value }} {{ tokenSymbol(row.tokenAddress) }}</span>
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
import { computed, onMounted, reactive, ref, type Reactive } from 'vue'
import type { ManyExpenseResponse, ManyExpenseWithBalances, Team } from '@/types'
import { tokenSymbol } from '@/utils'
import { useCustomFetch } from '@/composables'
import { useRoute } from 'vue-router'
import { formatEther, zeroAddress, type Address, keccak256 } from 'viem'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'

const { loading, team } = defineProps<{
  loading: boolean
  isContractOwner: boolean
  team: Partial<Team> | null
}>()
const route = useRoute()
const emits = defineEmits(['disableApproval', 'enableApproval'])
const statuses = ['all', 'disabled', 'enabled', 'expired']
const selectedRadio = ref('all')
const signatureToUpdate = ref('')
const manyExpenseAccountDataAll = reactive<ManyExpenseWithBalances[]>([])

const {
  error: fetchManyExpenseAccountDataError,
  execute: fetchManyExpenseAccountData,
  data: manyExpenseAccountData
} = useCustomFetch(`teams/${String(route.params.id)}/expense-data`, {
  immediate: false
})
  .get()
  .json<ManyExpenseResponse[]>()

const filteredApprovals = computed(() => {
  if (selectedRadio.value === 'all') {
    return manyExpenseAccountDataAll
  } else {
    return manyExpenseAccountDataAll.filter((approval) => approval.status === selectedRadio.value)
  }
})

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

//#region Functions
const initializeBalances = async () => {
  manyExpenseAccountDataAll.length = 0
  if (Array.isArray(manyExpenseAccountData.value) && team)
    for (const data of manyExpenseAccountData.value) {
      const amountWithdrawn = await readContract(config, {
        functionName: 'balances',
        address: team.expenseAccountEip712Address as Address,
        abi: expenseAccountABI,
        args: [keccak256(data.signature)]
      })

      const isExpired = data.expiry <= Math.floor(new Date().getTime() / 1000)

      // Populate the reactive balances object
      if (
        Array.isArray(amountWithdrawn) &&
        manyExpenseAccountDataAll.findIndex((item) => item.signature === data.signature) === -1
      ) {
        // New algo
        manyExpenseAccountDataAll.push({
          ...data,
          balances: {
            0: `${amountWithdrawn[0]}`,
            1:
              data.tokenAddress === zeroAddress
                ? formatEther(amountWithdrawn[1])
                : `${Number(amountWithdrawn[1]) / 1e6}`,
            2: amountWithdrawn[2] === true
          },
          status: isExpired ? 'expired' : amountWithdrawn[2] === 2 ? 'disabled' : 'enabled'
        })
      }
    }
}

onMounted(async () => {
  await fetchManyExpenseAccountData()
  await initializeBalances()
})
</script>
