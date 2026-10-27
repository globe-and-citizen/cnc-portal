<template>
  <main v-if="safeAddress" class="flex flex-col gap-8 pb-8" data-test="safe-wallet-view">
    <header
      class="border-primary-200 from-primary-50 dark:border-primary-900 dark:from-primary-950/40 relative overflow-hidden rounded-2xl border bg-gradient-to-br via-white to-white p-5 sm:p-7 dark:via-gray-950 dark:to-gray-950"
    >
      <div class="bg-primary-200/40 absolute -top-16 -right-12 h-48 w-48 rounded-full blur-3xl" />
      <div class="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-2xl">
          <div class="flex items-center gap-3">
            <div
              class="bg-primary flex h-11 w-11 items-center justify-center rounded-xl text-white"
            >
              <UIcon name="i-lucide-shield-check" class="h-6 w-6" />
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-semibold text-gray-950 dark:text-white">Team Safe</h1>
                <UBadge
                  :color="isSafeMissing ? 'error' : 'success'"
                  variant="soft"
                  data-test="safe-status-badge"
                >
                  {{ isSafeMissing ? 'Not found' : 'Active' }}
                </UBadge>
              </div>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Shared treasury protected by signer approvals.
              </p>
            </div>
          </div>
          <p
            v-if="!isSafeMissing"
            class="mt-5 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-300"
          >
            Check the wallet, manage funds and signers, then follow every proposal from approval to
            execution.
          </p>
        </div>

        <div
          class="rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-gray-800 dark:bg-gray-900/80"
        >
          <p class="text-xs font-medium text-gray-500">Safe address</p>
          <div class="mt-1 font-mono text-sm">
            <AddressTooltip :address="safeAddress" />
          </div>
        </div>
      </div>
    </header>

    <UAlert
      v-if="isSafeMissing"
      color="error"
      variant="soft"
      icon="i-lucide-circle-x"
      title="No Safe exists at this address"
      :description="`The address registered for this team has no contract on ${NETWORK.networkName}. The Safe was probably never deployed, or it was deployed on another network, so its balances, signers and transactions cannot be shown.`"
      data-test="safe-missing-notice"
    >
      <template #actions>
        <SafeAddModal v-if="canAddSafe" />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          label="Check again"
          class="justify-center"
          data-test="safe-missing-retry"
          @click="refetchBytecode()"
        />
      </template>
    </UAlert>

    <div
      v-else-if="isCheckingContract"
      class="flex justify-center p-8"
      role="status"
      data-test="safe-contract-loading"
    >
      <UIcon name="i-lucide-loader-circle" class="text-primary h-8 w-8 animate-spin" />
    </div>

    <template v-else>
      <UAlert
        v-if="isRouterOnAnotherSafe"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="New investments still go to another Safe"
        description="Investor deposits are sent to a Safe that is not this team's default Safe. Point them to the default Safe so new investments arrive here."
        data-test="safe-router-out-of-sync"
      >
        <template #actions>
          <SetSafeAddressAction compact />
        </template>
      </UAlert>

      <nav
        class="flex gap-2 overflow-x-auto rounded-xl border bg-white p-2 dark:border-gray-800 dark:bg-gray-950"
        aria-label="Safe wallet sections"
        data-test="safe-section-navigation"
      >
        <a
          v-for="item in sectionLinks"
          :key="item.href"
          :href="item.href"
          class="focus-visible:ring-primary shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-950 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white"
        >
          {{ item.label }}
        </a>
      </nav>

      <section id="safe-overview" class="scroll-mt-4" aria-labelledby="safe-overview-heading">
        <div class="mb-4">
          <p class="text-primary text-sm font-semibold">1 · Overview</p>
          <h2 id="safe-overview-heading" class="mt-1 text-xl font-semibold">
            Know what is available
          </h2>
        </div>
        <SafeBalanceSection :key="safeAddress" :address="safeAddress" />
      </section>

      <section id="safe-funds" class="scroll-mt-4" aria-labelledby="safe-funds-heading">
        <div class="mb-4">
          <p class="text-primary text-sm font-semibold">2 · Funds and control</p>
          <h2 id="safe-funds-heading" class="mt-1 text-xl font-semibold">
            Review assets and approval rules
          </h2>
          <p class="mt-1 text-sm text-gray-500">
            Holdings show what the Safe controls. Owners and threshold show who must approve
            actions.
          </p>
        </div>
        <div class="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div class="min-w-0 xl:col-span-3">
            <TokenHoldingsSection
              :rows="holdingRows"
              :is-loading="isLoadingHoldings"
              :is-incomplete="isIncomplete"
              :has-error="!!balancesError"
              compact
              class="h-full"
            />
          </div>
          <div id="safe-control" class="min-w-0 scroll-mt-4 xl:col-span-2">
            <SafeOwnersCard :address="safeAddress" />
          </div>
        </div>
      </section>

      <section id="safe-activity" class="scroll-mt-4" aria-labelledby="safe-activity-heading">
        <div class="mb-4">
          <p class="text-primary text-sm font-semibold">3 · Activity</p>
          <h2 id="safe-activity-heading" class="mt-1 text-xl font-semibold">
            Move proposals to completion
          </h2>
          <p class="mt-1 text-sm text-gray-500">
            Pending Safe actions need signer approvals before they can be executed.
          </p>
        </div>
        <div class="space-y-6">
          <SafeTransactions :address="safeAddress" />
          <SafeIncomingTransactions :address="safeAddress" />
        </div>
      </section>
    </template>

    <SafeHistoryCard v-if="teamStore.currentTeam?.safes?.length" :can-manage="canManageSafe">
      <template v-if="canAddSafe && !isSafeMissing && !isCheckingContract" #actions>
        <SafeAddModal />
      </template>
    </SafeHistoryCard>
  </main>

  <div
    v-else-if="isResolvingSafe"
    class="flex items-center justify-center p-8"
    role="status"
    aria-live="polite"
    data-test="safe-loading-state"
  >
    <div class="text-center">
      <UIcon name="i-lucide-loader-circle" class="text-primary mx-auto h-10 w-10 animate-spin" />
      <p class="mt-4 text-gray-500">Loading Safe…</p>
    </div>
  </div>

  <main v-else-if="canShowSafeSetup" class="w-full px-4 py-6 sm:p-8" data-test="safe-setup-view">
    <SafeSetupSection :can-manage="canManageSafe" @safe-registered="handleSafeRegistered" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAddress, type Address } from 'viem'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import SafeBalanceSection from '@/components/sections/SafeView/SafeBalanceSection.vue'
import SafeOwnersCard from '@/components/sections/SafeView/SafeOwnersCard.vue'
import TokenHoldingsSection from '@/components/ui/TokenHoldingsSection.vue'
import { useGetSafeBalancesQuery } from '@/queries/safeClient.queries'
import { toSafeHoldingRows } from '@/utils/safe/portfolio'
import { useStorage } from '@vueuse/core'
import SafeTransactions from '@/components/sections/SafeView/SafeTransactions.vue'
import SafeIncomingTransactions from '@/components/sections/SafeView/SafeIncomingTransactions.vue'
import SafeSetupSection from '@/components/sections/SafeView/SafeSetupSection.vue'
import SafeAddModal from '@/components/sections/SafeView/SafeAddModal.vue'
import SafeHistoryCard from '@/components/sections/SafeView/SafeHistoryCard.vue'
import SetSafeAddressAction from '@/components/sections/SherTokenView/InvestorActions/SetSafeAddressAction.vue'
import { useSafeDepositRouterSafeAddress } from '@/composables/safeDepositRouter/reads'
import { useGetSafeBytecodeQuery } from '@/queries/safe.queries'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'
import { useTeamStore, useUserDataStore } from '@/stores'
import { normalizeSafeAddress } from '@/utils/safe/address'
import { NETWORK } from '@/constant'

const route = useRoute()
const router = useRouter()
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const { isWriteDisabled } = useTeamWriteGuard()

const isLoadingSafe = ref(false)
const deployedSafeAddress = ref<Address>()

const sectionLinks = [
  { href: '#safe-overview', label: 'Overview' },
  { href: '#safe-funds', label: 'Funds' },
  { href: '#safe-control', label: 'Owners and threshold' },
  { href: '#safe-activity', label: 'Transactions' }
]

const defaultSafeAddress = computed(() => teamStore.getContractAddressByType('Safe'))
const safeAddress = computed(() => defaultSafeAddress.value || deployedSafeAddress.value)

const {
  data: bytecode,
  isLoading: isCheckingContract,
  refetch: refetchBytecode
} = useGetSafeBytecodeQuery({ pathParams: { safeAddress } })

/**
 * An address without code on-chain will never answer as a Safe, so its sections, which
 * would all fail, wait for the chain and are replaced by one notice.
 */
const isSafeMissing = computed(() => bytecode.value === '0x')

const { data: routerSafeAddress } = useSafeDepositRouterSafeAddress()
const isRouterOnAnotherSafe = computed(
  () =>
    !!routerSafeAddress.value &&
    !!defaultSafeAddress.value &&
    (routerSafeAddress.value as string).toLowerCase() !== defaultSafeAddress.value.toLowerCase()
)

const currency = useStorage('currency', { code: 'USD', name: 'US Dollar', symbol: '$' })
const {
  data: balances,
  error: balancesError,
  isLoading: isLoadingHoldings
} = useGetSafeBalancesQuery({
  pathParams: {
    safeAddress: () =>
      isSafeMissing.value || isCheckingContract.value ? undefined : safeAddress.value,
    fiatCode: () => currency.value.code
  }
})
const holdingRows = computed(() => toSafeHoldingRows(balances.value, currency.value.code))
const isIncomplete = computed(() => holdingRows.value.some((row) => row.balance === null))

const isResolvingSafe = computed(() => teamStore.currentTeamMeta.isPending || isLoadingSafe.value)

const canShowSafeSetup = computed(
  () => !!teamStore.currentTeamId && !!teamStore.currentTeamMeta.data && !isResolvingSafe.value
)

const canManageSafe = computed(
  () =>
    !!userDataStore.address &&
    isAddress(userDataStore.address) &&
    teamStore.currentTeam?.ownerAddress.toLowerCase() === userDataStore.address.toLowerCase()
)
const canAddSafe = computed(() => canManageSafe.value && !isWriteDisabled.value)

/** Keeps the page URL on the Safe it shows. */
async function syncUrlWithSafe(address: Address) {
  if (route.params.id && route.params.address !== address) {
    await router.replace({
      name: 'safe-account',
      params: { id: route.params.id as string, address }
    })
  }
}

/** Follows the team default Safe once a registration, a switch or a removal is saved. */
watch(defaultSafeAddress, (address) => {
  deployedSafeAddress.value = undefined
  isLoadingSafe.value = false
  if (address) void syncUrlWithSafe(address)
})

const handleSafeRegistered = async (address: Address) => {
  const normalizedAddress = normalizeSafeAddress(address)
  deployedSafeAddress.value = normalizedAddress
  isLoadingSafe.value = true
  await syncUrlWithSafe(normalizedAddress)
}
</script>
