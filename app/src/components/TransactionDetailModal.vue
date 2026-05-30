<template>
  <UModal v-model:open="open" title="Transaction Details">
    <template #body>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <UBadge variant="soft" class="capitalize">{{ transaction.type }}</UBadge>
          <span class="text-muted text-sm">{{ formatDateShort(String(transaction.date)) }}</span>
        </div>
        <UDivider />
        <div class="flex items-center justify-between">
          <span class="text-muted text-sm font-medium">Tx Hash</span>
          <AddressToolTip :address="transaction.txHash" :slice="true" type="transaction" />
        </div>

        <!-- deposit / transfer / withdraw / dividend / fee / mint / rawToken -->
        <template v-if="isTransferGroup">
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">From</span>
            <UserComponent :user="resolveUser(transaction.from)" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">To</span>
            <UserComponent :user="resolveUser(transaction.to)" />
          </div>
          <div v-if="hasAmount" class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">Amount</span>
            <div class="text-right">
              <div>{{ formatCryptoAmount(transaction.amount) }} {{ transaction.token }}</div>
              <div v-if="transaction.amountLocal" class="text-muted text-xs">
                {{ formatCurrencyShort(transaction.amountLocal, currencyStore.localCurrency.code) }}
              </div>
            </div>
          </div>
        </template>

        <!-- approvalActivated / approvalDeactivated / wageClaimEnabled / wageClaimDisabled -->
        <template v-else-if="isHashStatusGroup">
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">Contract</span>
            <UserComponent :user="resolveUser(transaction.from)" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">Signature Hash</span>
            <AddressToolTip :address="transaction.to" :slice="true" type="address" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">Status</span>
            <UBadge :color="hashStatusActive ? 'success' : 'error'" variant="soft">
              {{ hashStatusLabel }}
            </UBadge>
          </div>
        </template>

        <!-- tokenSupportAdded / tokenSupportRemoved -->
        <template v-else-if="isTokenSupportGroup">
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">Contract</span>
            <UserComponent :user="resolveUser(transaction.from)" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">Token</span>
            <UserComponent :user="resolveUser(transaction.tokenAddress)" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">Action</span>
            <UBadge
              :color="transaction.type === 'tokenSupportAdded' ? 'success' : 'error'"
              variant="soft"
            >
              {{ transaction.type === 'tokenSupportAdded' ? 'Added' : 'Removed' }}
            </UBadge>
          </div>
        </template>

        <!-- safeDepositsEnabled / safeDepositsDisabled / safeAddressUpdated / safeMultiplierUpdated / officerAddressUpdated -->
        <template v-else-if="isConfigChangeGroup">
          <template
            v-if="
              transaction.type === 'safeDepositsEnabled' ||
              transaction.type === 'safeDepositsDisabled'
            "
          >
            <div class="flex items-center justify-between">
              <span class="text-muted text-sm font-medium">Action</span>
              <UBadge
                :color="transaction.type === 'safeDepositsEnabled' ? 'success' : 'error'"
                variant="soft"
              >
                {{ transaction.type === 'safeDepositsEnabled' ? 'Enabled' : 'Disabled' }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted text-sm font-medium">By</span>
              <UserComponent :user="resolveUser(transaction.from)" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted text-sm font-medium">Contract</span>
              <UserComponent :user="resolveUser(transaction.to)" />
            </div>
          </template>

          <template v-else-if="transaction.type === 'safeAddressUpdated'">
            <div class="flex items-center justify-between">
              <span class="text-muted text-sm font-medium">Old Safe</span>
              <AddressToolTip :address="transaction.from" :slice="true" type="address" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted text-sm font-medium">New Safe</span>
              <AddressToolTip :address="transaction.to" :slice="true" type="address" />
            </div>
          </template>

          <template v-else-if="transaction.type === 'safeMultiplierUpdated'">
            <div class="flex items-center justify-between">
              <span class="text-muted text-sm font-medium">New Multiplier</span>
              <span class="font-medium">{{ transaction.amount }}{{ transaction.token }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted text-sm font-medium">Contract</span>
              <UserComponent :user="resolveUser(transaction.from)" />
            </div>
          </template>

          <template v-else>
            <div class="flex items-center justify-between">
              <span class="text-muted text-sm font-medium">New Address</span>
              <AddressToolTip :address="transaction.to" :slice="true" type="address" />
            </div>
          </template>
        </template>

        <!-- tokenAddressChanged -->
        <template v-else-if="transaction.type === 'tokenAddressChanged'">
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">Old Address</span>
            <AddressToolTip :address="transaction.from" :slice="true" type="address" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">New Address</span>
            <AddressToolTip :address="transaction.to" :slice="true" type="address" />
          </div>
        </template>

        <!-- fallback -->
        <template v-else>
          <div v-if="transaction.from" class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">From</span>
            <AddressToolTip :address="transaction.from" :slice="true" type="address" />
          </div>
          <div v-if="transaction.to" class="flex items-center justify-between">
            <span class="text-muted text-sm font-medium">To</span>
            <AddressToolTip :address="transaction.to" :slice="true" type="address" />
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TransactionHistoryItemRow } from '@/types/transaction-history'
import AddressToolTip from '@/components/AddressToolTip.vue'
import UserComponent from '@/components/UserComponent.vue'
import { resolveUser, formatCryptoAmount, formatCurrencyShort } from '@/utils'
import { formatDateShort } from '@/utils/dayUtils'
import { useCurrencyStore } from '@/stores/currencyStore'

const props = defineProps<{
  transaction: TransactionHistoryItemRow
}>()

const open = defineModel<boolean>('open', { default: false })

const currencyStore = useCurrencyStore()

const TRANSFER_TYPES = new Set([
  'deposit',
  'tokenDeposit',
  'transfer',
  'tokenTransfer',
  'ownerTreasuryWithdrawNative',
  'ownerTreasuryWithdrawToken',
  'withdraw',
  'withdrawToken',
  'dividendDistribution',
  'dividendDistributed',
  'dividendPaid',
  'dividendPaymentFailed',
  'feePaid',
  'mint',
  'safeDeposit',
  'rawTokenIn',
  'rawTokenOut',
  'rawTokenInternal'
])

const HASH_STATUS_TYPES = new Set([
  'approvalActivated',
  'approvalDeactivated',
  'wageClaimEnabled',
  'wageClaimDisabled'
])

const TOKEN_SUPPORT_TYPES = new Set(['tokenSupportAdded', 'tokenSupportRemoved'])

const CONFIG_CHANGE_TYPES = new Set([
  'safeDepositsEnabled',
  'safeDepositsDisabled',
  'safeAddressUpdated',
  'safeMultiplierUpdated',
  'officerAddressUpdated'
])

const isTransferGroup = computed(() => TRANSFER_TYPES.has(props.transaction.type))
const isHashStatusGroup = computed(() => HASH_STATUS_TYPES.has(props.transaction.type))
const isTokenSupportGroup = computed(() => TOKEN_SUPPORT_TYPES.has(props.transaction.type))
const isConfigChangeGroup = computed(() => CONFIG_CHANGE_TYPES.has(props.transaction.type))

const hasAmount = computed(() => Number(props.transaction.amount) > 0)

const hashStatusActive = computed(
  () =>
    props.transaction.type === 'approvalActivated' || props.transaction.type === 'wageClaimEnabled'
)

const hashStatusLabel = computed(() => {
  switch (props.transaction.type) {
    case 'approvalActivated':
      return 'Activated'
    case 'approvalDeactivated':
      return 'Deactivated'
    case 'wageClaimEnabled':
      return 'Enabled'
    case 'wageClaimDisabled':
      return 'Disabled'
    default:
      return props.transaction.type
  }
})
</script>
