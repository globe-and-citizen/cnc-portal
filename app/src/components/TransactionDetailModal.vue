<template>
  <USlideover v-model:open="open" title="Transaction detail">
    <template #body>
      <div class="space-y-4">
        <!-- TRANSACTION -->
        <p class="text-muted text-xs font-semibold tracking-wide uppercase">Transaction</p>
        <UCard class="bg-primary/5">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted">Tx hash</span>
              <AddressToolTip :address="transaction.txHash" :slice="true" type="transaction" />
            </div>
            <div v-if="txSender" class="flex items-center justify-between text-sm">
              <span class="text-muted">Initiator</span>
              <UserComponent :user="resolveUser(txSender)" />
            </div>
            <template v-if="receipt">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">Block</span>
                <span>{{ Number(receipt.blockNumber).toLocaleString() }}</span>
              </div>
            </template>
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted">Timestamp</span>
              <span>
                {{ formatDateUTC(String(transaction.date)) }}
                <span class="text-muted">
                  · {{ formatDateRelative(String(transaction.date)) }}</span
                >
              </span>
            </div>
            <template v-if="receipt">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">Status</span>
                <UBadge :color="receipt.status === 'success' ? 'success' : 'error'" variant="soft">
                  {{ receipt.status === 'success' ? 'Success' : 'Reverted' }}
                </UBadge>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">Gas used</span>
                <span>{{ Number(receipt.gasUsed).toLocaleString() }}</span>
              </div>
            </template>
            <div v-if="loading" class="text-muted flex items-center gap-1 text-xs">
              <UIcon name="heroicons:arrow-path" class="animate-spin" />
              Loading on-chain data…
            </div>
          </div>
        </UCard>

        <!-- SUMMARY -->
        <template v-if="summary">
          <UDivider />
          <p class="text-muted text-xs font-semibold tracking-wide uppercase">Summary</p>
          <UCard class="bg-primary/5"
            ><p class="text-sm">{{ summary }}</p></UCard
          >
        </template>

        <!-- DECODED INPUTS -->
        <template v-if="decodedInput">
          <UDivider />
          <p class="text-muted text-xs font-semibold tracking-wide uppercase">Decoded Inputs</p>
          <UCard class="bg-primary/5">
            <div class="space-y-2">
              <p class="text-muted mb-1 font-mono text-xs">{{ decodedInput.functionName }}(…)</p>
              <div
                v-for="param in decodedInput.params"
                :key="param.name"
                class="flex items-center justify-between gap-4 text-sm"
              >
                <span class="text-muted shrink-0 font-mono text-xs">{{ param.name }}</span>
                <AddressToolTip
                  v-if="param.isAddress"
                  :address="param.display"
                  :slice="true"
                  type="address"
                />
                <span v-else class="text-right font-mono text-xs break-all">{{
                  param.display
                }}</span>
              </div>
            </div>
          </UCard>
        </template>

        <!-- EVENTS -->
        <UDivider />
        <p class="text-muted text-xs font-semibold tracking-wide uppercase">
          Events · {{ allEvents.length }}
        </p>
        <div class="space-y-2">
          <UCard v-for="(event, i) in allEvents" :key="i" class="bg-primary/5">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-muted font-mono text-xs">#{{ i }}</span>
                <UBadge variant="soft" class="capitalize">{{
                  getTransactionTypeLabel(event.type)
                }}</UBadge>
              </div>
              <template v-if="event.token === '-'">
                <div v-if="event.from" class="flex items-center justify-between text-sm">
                  <span class="text-muted text-xs">From</span>
                  <UserComponent :user="resolveUser(event.from)" />
                </div>
                <div v-if="event.to" class="flex items-center justify-between text-sm">
                  <span class="text-muted text-xs">To</span>
                  <UserComponent :user="resolveUser(event.to)" />
                </div>
              </template>
              <template v-else>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted text-xs">Token</span>
                  <div class="flex items-center gap-1.5">
                    <span class="font-medium">{{ event.token }}</span>
                    <AddressToolTip
                      v-if="event.tokenAddress"
                      :address="event.tokenAddress"
                      :slice="true"
                      type="address"
                    />
                  </div>
                </div>
              </template>
              <div v-if="Number(event.amount) > 0" class="flex items-center justify-between">
                <span class="text-muted text-xs">Amount</span>
                <div class="text-right text-sm">
                  <div>{{ formatCryptoAmount(String(event.amount)) }} {{ event.token }}</div>
                  <div v-if="event.amountLocal" class="text-muted text-xs">
                    {{ formatCurrencyShort(event.amountLocal, currencyStore.localCurrency.code) }}
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        icon="heroicons:arrow-top-right-on-square"
        label="Open in block explorer"
        color="neutral"
        variant="outline"
        size="sm"
        :href="`${NETWORK.blockExplorerUrl}/tx/${transaction.txHash}`"
        target="_blank"
      />
      <UButton
        :icon="copied ? 'heroicons:check' : 'heroicons:clipboard-document'"
        :label="copied ? 'Copied!' : 'Copy raw calldata'"
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="!rawCalldata"
        @click="copyCalldata"
      />
      <UButton
        label="Close"
        color="neutral"
        variant="subtle"
        size="sm"
        class="ml-auto"
        @click="open = false"
      />
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { decodeFunctionData } from 'viem'
import type { TransactionReceipt, Abi, AbiFunction } from 'viem'
import type { GroupedTransactionRow, TransactionHistoryItemRow } from '@/types/transaction-history'
import AddressToolTip from '@/components/AddressToolTip.vue'
import UserComponent from '@/components/UserComponent.vue'
import {
  resolveUser,
  formatCryptoAmount,
  formatCurrencyShort,
  getTransactionSummary,
  getTransactionTypeLabel
} from '@/utils'
import { formatDateRelative, formatDateUTC } from '@/utils/dayUtils'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { getPublicClient } from '@/utils/web3Util'
import { NETWORK } from '@/constant'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'

const CONTRACT_ABI_MAP: Record<string, Abi> = {
  Bank: BANK_ABI,
  InvestorV1: INVESTOR_ABI,
  ExpenseAccountEIP712: EXPENSE_ACCOUNT_EIP712_ABI,
  CashRemunerationEIP712: CASH_REMUNERATION_EIP712_ABI,
  SafeDepositRouter: SAFE_DEPOSIT_ROUTER_ABI,
  Elections: ELECTIONS_ABI,
  Proposals: PROPOSALS_ABI
}

interface DecodedParam {
  name: string
  type: string
  display: string
  isAddress: boolean
}

interface DecodedInputData {
  functionName: string
  params: DecodedParam[]
}

const props = defineProps<{
  transaction: TransactionHistoryItemRow
}>()

const open = defineModel<boolean>('open', { default: false })

const currencyStore = useCurrencyStore()
const teamStore = useTeamStore()

const receipt = ref<TransactionReceipt | null>(null)
const decodedInput = ref<DecodedInputData | null>(null)
const rawCalldata = ref<string | null>(null)
const txSender = ref<string | null>(null)
const loading = ref(false)
const copied = ref(false)

const copyCalldata = async () => {
  if (!rawCalldata.value) return
  await navigator.clipboard.writeText(rawCalldata.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const formatDecodedValue = (
  type: string,
  value: unknown
): { display: string; isAddress: boolean } => {
  if (value === null || value === undefined) return { display: '-', isAddress: false }
  if (type === 'address') return { display: String(value), isAddress: true }
  if (typeof value === 'bigint') return { display: value.toLocaleString(), isAddress: false }
  if (Array.isArray(value)) {
    const innerType = type.replace(/\[\d*\]$/, '')
    const items = value.map((v) => formatDecodedValue(innerType, v).display)
    return { display: `[${items.join(', ')}]`, isAddress: false }
  }
  return { display: String(value), isAddress: false }
}

watch(
  () => props.transaction.txHash,
  async (hash) => {
    if (!hash) return
    receipt.value = null
    decodedInput.value = null
    rawCalldata.value = null
    loading.value = true
    try {
      const client = getPublicClient()
      const [receiptData, txData] = await Promise.all([
        client.getTransactionReceipt({ hash: hash as `0x${string}` }),
        client.getTransaction({ hash: hash as `0x${string}` })
      ])
      receipt.value = receiptData
      rawCalldata.value = txData.input ?? null
      txSender.value = txData.from ?? null

      const toAddr = txData.to?.toLowerCase() ?? ''
      const contract = teamStore.currentTeam?.teamContracts?.find(
        (c) => c.address.toLowerCase() === toAddr
      )
      const abi = contract ? CONTRACT_ABI_MAP[contract.type] : undefined

      if (abi && txData.input && txData.input !== '0x') {
        try {
          const { functionName, args } = decodeFunctionData({ abi, data: txData.input })
          const abiFunction = abi.find(
            (item) => item.type === 'function' && (item as AbiFunction).name === functionName
          ) as AbiFunction | undefined

          const params: DecodedParam[] = (args ?? []).map((arg, i) => {
            const paramDef = abiFunction?.inputs[i]
            const type = paramDef?.type ?? 'unknown'
            const { display, isAddress } = formatDecodedValue(type, arg)
            return { name: paramDef?.name ?? `arg${i}`, type, display, isAddress }
          })

          decodedInput.value = { functionName, params }
        } catch {
          // ABI mismatch or unsupported encoding — skip silently
        }
      }
    } catch {
      receipt.value = null
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

const grouped = computed(
  () => props.transaction as unknown as GroupedTransactionRow<TransactionHistoryItemRow>
)

const allEvents = computed((): TransactionHistoryItemRow[] => [
  props.transaction,
  ...(grouped.value.subRows ?? [])
])

const summary = computed(() => getTransactionSummary(props.transaction))
</script>
