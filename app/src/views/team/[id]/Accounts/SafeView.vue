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
                <UBadge color="success" variant="soft">Active</UBadge>
              </div>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Shared treasury protected by signer approvals.
              </p>
            </div>
          </div>
          <p class="mt-5 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-300">
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
          Holdings show what the Safe controls. Owners and threshold show who must approve actions.
        </p>
      </div>
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div class="min-w-0 xl:col-span-3">
          <TokenHoldingsSection :key="safeAddress" :address="safeAddress" class="h-full" />
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
    <section class="w-full" aria-labelledby="safe-setup-heading">
      <div class="mb-7 max-w-3xl">
        <p class="text-primary text-sm font-semibold">Team treasury</p>
        <h1
          id="safe-setup-heading"
          class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white"
        >
          Set up your team Safe
        </h1>
        <p class="mt-2 text-gray-500">
          Choose how this team will connect its shared multi-signature wallet. You can deploy a new
          Safe or register one the team already controls.
        </p>
      </div>

      <ol class="mb-7 grid gap-3 md:grid-cols-3" aria-label="Safe setup steps">
        <li
          v-for="(step, index) in setupSteps"
          :key="step.title"
          class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
        >
          <div class="flex items-start gap-3">
            <span
              class="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            >
              {{ index + 1 }}
            </span>
            <div>
              <p class="font-medium">{{ step.title }}</p>
              <p class="mt-1 text-sm text-gray-500">{{ step.description }}</p>
            </div>
          </div>
        </li>
      </ol>

      <UAlert
        v-if="!canManageSafe"
        class="mb-6"
        color="warning"
        variant="soft"
        icon="i-lucide-shield-alert"
        title="Team owner action required"
        description="Only the team owner can deploy or import a Safe. Ask the owner to complete setup, then return here to review the wallet."
        data-test="safe-setup-owner-notice"
      />

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SafeDeploymentCard
          :team-id="Number(teamStore.currentTeamId)"
          @safe-deployed="handleSafeRegistered"
        />
        <SafeImportCard
          :team-id="Number(teamStore.currentTeamId)"
          @safe-imported="handleSafeRegistered"
        />
      </div>
    </section>
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
import SafeTransactions from '@/components/sections/SafeView/SafeTransactions.vue'
import SafeIncomingTransactions from '@/components/sections/SafeView/SafeIncomingTransactions.vue'
import SafeDeploymentCard from '@/components/sections/SafeView/SafeDeploymentCard.vue'
import SafeImportCard from '@/components/sections/SafeView/SafeImportCard.vue'
import { useTeamStore, useUserDataStore } from '@/stores'

const route = useRoute()
const router = useRouter()
const teamStore = useTeamStore()
const userDataStore = useUserDataStore()

const isLoadingSafe = ref(false)
const deployedSafeAddress = ref<Address>()

const sectionLinks = [
  { href: '#safe-overview', label: 'Overview' },
  { href: '#safe-funds', label: 'Funds' },
  { href: '#safe-control', label: 'Owners and threshold' },
  { href: '#safe-activity', label: 'Transactions' }
]

const setupSteps = [
  { title: 'Choose a Safe', description: 'Deploy a new wallet or inspect an existing one.' },
  {
    title: 'Confirm as owner',
    description: 'Only the team owner can attach the Safe to this team.'
  },
  { title: 'Start collaborating', description: 'Fund the wallet and collect signer approvals.' }
]

const safeAddress = computed(
  () => teamStore.getContractAddressByType('Safe') || deployedSafeAddress.value
)

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

watch(safeAddress, (address) => {
  if (address) isLoadingSafe.value = false
})

const handleSafeRegistered = async (address: Address) => {
  deployedSafeAddress.value = address
  isLoadingSafe.value = true

  if (route.params.id && route.params.address !== address) {
    await router.replace({
      name: 'safe-account',
      params: { id: route.params.id as string, address }
    })
  }
}
</script>
