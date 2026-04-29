<template>
  <div class="flex flex-col gap-6">
    <!-- Treasury Overview -->
    <div class="flex flex-col gap-4">
      <h3 class="text-lg font-semibold">Treasury Overview</h3>

      <!-- Total Balance Card -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
            <p v-if="isLoadingBalances" class="mt-1">
              <USkeleton class="h-8 w-40" />
            </p>
            <p v-else class="text-3xl font-bold">
              {{ totalBalance }}
            </p>
          </div>
          <div class="bg-primary/10 rounded-full p-3">
            <UIcon name="heroicons:building-library" class="text-primary size-8" />
          </div>
        </div>
      </UCard>

      <!-- Individual Account Balances -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UCard
          v-for="account in accountBalances"
          :key="account.label"
          class="cursor-pointer transition-shadow hover:shadow-lg"
          @click="$router.push(account.to)"
        >
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 rounded-lg p-2">
              <UIcon :name="account.icon" class="text-primary size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ account.label }}</p>
              <p v-if="account.isLoading" class="mt-0.5">
                <USkeleton class="h-5 w-24" />
              </p>
              <p v-else class="truncate font-semibold">{{ account.formattedBalance }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Team Members Overview -->
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Team Members</h3>
        <UBadge color="primary" variant="subtle">
          {{ members.length }} member{{ members.length !== 1 ? 's' : '' }}
        </UBadge>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UCard>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-green-500/10 p-2">
              <UIcon name="heroicons:user-group" class="size-5 text-green-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p class="text-xl font-semibold">{{ activeMembers }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-amber-500/10 p-2">
              <UIcon name="heroicons:pause-circle" class="size-5 text-amber-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Paused</p>
              <p class="text-xl font-semibold">{{ pausedMembers }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-gray-500/10 p-2">
              <UIcon name="heroicons:user-minus" class="size-5 text-gray-500" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">No Wage Set</p>
              <p class="text-xl font-semibold">{{ noWageMembers }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Quick Access -->
    <div class="flex flex-col gap-4">
      <h3 class="text-lg font-semibold">Quick Access</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UCard
          v-for="section in quickAccessSections"
          :key="section.label"
          class="cursor-pointer transition-shadow hover:shadow-lg"
          @click="$router.push(section.to)"
        >
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 rounded-lg p-2">
              <UIcon :name="section.icon" class="text-primary size-5" />
            </div>
            <div>
              <p class="font-semibold">{{ section.label }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ section.description }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTeamStore } from '@/stores/teamStore'
import { useCurrencyStore } from '@/stores'
import { computed } from 'vue'
import { useContractBalance } from '@/composables/useContractBalance'
import type { Address } from 'viem'

const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()

// Contract addresses
const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
const safeAddress = computed(() => teamStore.getContractAddressByType('Safe'))
const expenseAddress = computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))
const cashRemAddress = computed(() => teamStore.getContractAddressByType('CashRemunerationEIP712'))

// Balances
const bankBalance = useContractBalance(bankAddress as unknown as Address)
const safeBalance = useContractBalance(safeAddress as unknown as Address)
const expenseBalance = useContractBalance(expenseAddress as unknown as Address)
const cashRemBalance = useContractBalance(cashRemAddress as unknown as Address)

const currencyCode = computed(() => currencyStore.localCurrency.code)

const isLoadingBalances = computed(
  () =>
    bankBalance.isLoading.value ||
    safeBalance.isLoading.value ||
    expenseBalance.isLoading.value ||
    cashRemBalance.isLoading.value
)

function getFormattedTotal(balance: ReturnType<typeof useContractBalance>) {
  return balance.total.value[currencyCode.value]?.formated ?? '$0.00'
}

function getRawTotal(balance: ReturnType<typeof useContractBalance>) {
  return balance.total.value[currencyCode.value]?.value ?? 0
}

const totalBalance = computed(() => {
  const sum =
    getRawTotal(bankBalance) +
    getRawTotal(safeBalance) +
    getRawTotal(expenseBalance) +
    getRawTotal(cashRemBalance)
  const symbol = currencyStore.localCurrency.symbol
  return `${symbol}${sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
})

const accountBalances = computed(() => {
  const id = teamStore.currentTeamId || '1'
  return [
    {
      label: 'Bank Account',
      icon: 'heroicons:banknotes',
      formattedBalance: getFormattedTotal(bankBalance),
      isLoading: bankBalance.isLoading.value,
      to: { name: 'bank-account', params: { id } }
    },
    {
      label: 'Safe Account',
      icon: 'heroicons:shield-check',
      formattedBalance: getFormattedTotal(safeBalance),
      isLoading: safeBalance.isLoading.value,
      to: { name: 'safe-account', params: { id, address: safeAddress.value || '0x' } }
    },
    {
      label: 'Expense Account',
      icon: 'heroicons:receipt-percent',
      formattedBalance: getFormattedTotal(expenseBalance),
      isLoading: expenseBalance.isLoading.value,
      to: { name: 'expense-account', params: { id } }
    },
    {
      label: 'Cash Remuneration',
      icon: 'heroicons:currency-dollar',
      formattedBalance: getFormattedTotal(cashRemBalance),
      isLoading: cashRemBalance.isLoading.value,
      to: { name: 'payroll-account', params: { id } }
    }
  ]
})

// Team Members
const members = computed(() => teamStore.currentTeamMeta.data?.members ?? [])
const activeMembers = computed(
  () => members.value.filter((m) => m.currentWage && !m.currentWage.disabled).length
)
const pausedMembers = computed(() => members.value.filter((m) => m.currentWage?.disabled).length)
const noWageMembers = computed(() => members.value.filter((m) => !m.currentWage).length)

// Quick Access
const quickAccessSections = computed(() => {
  const id = teamStore.currentTeamId || '1'
  return [
    {
      label: 'Payroll',
      icon: 'heroicons:currency-dollar',
      description: 'Manage salaries',
      to: { name: 'payroll-account', params: { id } }
    },
    {
      label: 'Contract Management',
      icon: 'heroicons:wrench',
      description: 'Deploy and manage contracts',
      to: { name: 'contract-management', params: { id } }
    },
    {
      label: 'SHER Token',
      icon: 'heroicons:chart-pie',
      description: 'Token management',
      to: { name: 'sher-token', params: { id } }
    },
    {
      label: 'Administration',
      icon: 'heroicons:chart-bar',
      description: 'Elections and proposals',
      to: { name: 'bod-elections', params: { id } }
    },
    {
      label: 'Vesting',
      icon: 'heroicons:lock-closed',
      description: 'Vesting schedules',
      to: { name: 'vesting', params: { id } }
    },
    {
      label: 'Company Payroll',
      icon: 'heroicons:document-text',
      description: 'Company-wide payroll',
      to: { name: 'team-payroll', params: { id } }
    }
  ]
})
</script>
