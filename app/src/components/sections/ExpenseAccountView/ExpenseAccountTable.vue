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
          :loading="isLoadingDeactivateApproval && signatureToUpdate === row.signature"
          :disabled="!(contractOwnerAddress === userDataStore.address)"
          @click="
            () => {
              //emits('disableApproval', row.signature)
              signatureToUpdate = row.signature
              deactivateApproval(row.signature)
            }
          "
          >Disable</ButtonUI
        >
        <ButtonUI
          v-if="row.status == 'disabled'"
          variant="info"
          data-test="enable-button"
          size="sm"
          :loading="isLoadingActivateApproval && signatureToUpdate === row.signature"
          :disabled="!(contractOwnerAddress === userDataStore.address)"
          @click="
            () => {
              //emits('enableApproval', row.signature)
              signatureToUpdate = row.signature
              activateApproval(row.signature)
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
        <span>{{ row.budgetData[2]?.value }} {{ tokenSymbol(row.tokenAddress) }}</span>
      </template>
      <template #transactions-data="{ row }">
        <span>{{ row.balances[0] }}/{{ row.budgetData[0]?.value }}</span>
      </template>
      <template #amountTransferred-data="{ row }">
        <span>{{ row.balances[1] }}/{{ row.budgetData[1]?.value }}</span>
      </template>
    </TableComponent>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { log, parseError, tokenSymbol } from '@/utils'
import { useToastStore, useUserDataStore, useTeamStore, useExpenseDataStore } from '@/stores'
import { type Address, keccak256 } from 'viem'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import expenseAccountABI from '@/artifacts/abi/expense-account-eip712.json'
import type { ManyExpenseWithBalances } from '@/types'
import { useRoute } from 'vue-router'

// const { team /*, reload*/ } = defineProps<{
//   team: Partial<Team>
// }>()
const reload = defineModel()
const teamStore = useTeamStore()
const { addErrorToast, addSuccessToast } = useToastStore()
const userDataStore = useUserDataStore()
const expenseDataStore = useExpenseDataStore()
const route = useRoute()
const statuses = ['all', 'disabled', 'enabled', 'expired']
const selectedRadio = ref('all')
const signatureToUpdate = ref('')

const expenseAccountEip712Address = computed(
  () =>
    teamStore.currentTeam?.teamContracts?.find(
      (contract) => contract.type === 'ExpenseAccountEIP712'
    )?.address as Address
  // team.teamContracts?.find((contract) => contract.type === 'ExpenseAccountEIP712')
  //   ?.address as Address
)
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

//#endregion Composables
const {
  data: contractOwnerAddress,
  refetch: fetchExpenseAccountOwner,
  error: errorGetOwner
} = useReadContract({
  functionName: 'owner',
  address: expenseAccountEip712Address as unknown as Address,
  abi: expenseAccountABI
})
//deactivate approval
const {
  writeContract: executeDeactivateApproval,
  isPending: isLoadingDeactivateApproval,
  error: errorDeactivateApproval,
  data: deactivateHash
} = useWriteContract()

const { isLoading: isConfirmingDeactivate, isSuccess: isConfirmedDeactivate } =
  useWaitForTransactionReceipt({
    hash: deactivateHash
  })

//activate approval
const {
  writeContract: executeActivateApproval,
  isPending: isLoadingActivateApproval,
  error: errorActivateApproval,
  data: activateHash
} = useWriteContract()

const { isLoading: isConfirmingActivate, isSuccess: isConfirmedActivate } =
  useWaitForTransactionReceipt({
    hash: activateHash
  })
//#region

const filteredApprovals = computed(() => {
  if (selectedRadio.value === 'all') {
    return expenseDataStore.allExpenseDataParsed //manyExpenseAccountDataAll
  } else {
    return /*manyExpenseAccountDataAll*/ expenseDataStore.allExpenseDataParsed.filter(
      (approval: ManyExpenseWithBalances) => approval.status === selectedRadio.value
    )
  }
})

//#region Functions
const deactivateApproval = async (signature: `0x{string}`) => {
  const signatureHash = keccak256(signature)

  executeDeactivateApproval({
    address: expenseAccountEip712Address.value,
    args: [signatureHash],
    abi: expenseAccountABI,
    functionName: 'deactivateApproval'
  })
}

const activateApproval = async (signature: `0x{string}`) => {
  const signatureHash = keccak256(signature)

  executeActivateApproval({
    address: expenseAccountEip712Address.value,
    args: [signatureHash],
    abi: expenseAccountABI,
    functionName: 'activateApproval'
  })
}

//#endregion

//#region Watch
watch(reload, async (newState) => {
  if (newState) {
    await fetchExpenseAccountOwner()
  }
})
// watch(
//   () => team,
//   async (newTeam) => {
//     if (newTeam) {
//       expenseAccountEip712Address.value = newTeam.expenseAccountEip712Address as string
//       await fetchExpenseAccountOwner()
//     }
//   }
// )
watch(isConfirmingActivate, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedActivate.value) {
    reload.value = true
    addSuccessToast('Activate Successful')
    // await initializeBalances()
    expenseDataStore.fetchAllExpenseData(route.params.id as string)
    reload.value = false
  }
})
watch(isConfirmingDeactivate, async (isConfirming, wasConfirming) => {
  if (!isConfirming && wasConfirming && isConfirmedDeactivate.value) {
    reload.value = true
    addSuccessToast('Deactivate Successful')
    // await initializeBalances()
    expenseDataStore.fetchAllExpenseData(route.params.id as string)
    reload.value = false
  }
})
watch(errorDeactivateApproval, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to deactivate approval')
  }
})
watch(errorActivateApproval, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Failed to activate approval')
  }
})
watch(errorGetOwner, (newVal) => {
  if (newVal) {
    log.error(parseError(newVal))
    addErrorToast('Error Getting Contract Owner')
  }
})
//#endregion

onMounted(async () => {
  await fetchExpenseAccountOwner()
})
</script>
