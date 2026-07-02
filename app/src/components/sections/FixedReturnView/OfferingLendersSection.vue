<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="text-base font-extrabold text-[#0f3d2e]">
          Lenders
          <span class="text-sm font-semibold text-[#9aaba2]">· {{ partners.length }}</span>
        </div>
        <UInput
          v-model="lenderSearch"
          icon="heroicons:magnifying-glass"
          placeholder="Search lenders…"
          aria-label="Search lenders"
          data-test="lender-search-input"
          class="w-56"
        />
      </div>
    </template>
    <UTable
      :data="filteredPartners"
      :columns="lenderColumns"
      :loading="isLoading"
      class="min-w-[820px]"
    >
      <template #lender-cell="{ row: { original: lender } }">
        <UserComponent
          :user="{ address: lender.address, name: lender.name }"
          class="min-w-0 flex-1"
        />
      </template>
      <template #principal-cell="{ row: { original: lender } }">
        <span class="font-bold">{{ lender.principalFmt }}</span>
      </template>
      <template #rate-cell="{ row: { original: lender } }">
        {{ lender.rateFmt }}
      </template>
      <template #expected-cell="{ row: { original: lender } }">
        <span class="font-bold">{{ lender.expectedFmt }}</span>
      </template>
      <template #paid-cell="{ row: { original: lender } }">
        <div class="min-w-36">
          <div class="mb-1.5 flex justify-between text-sm font-semibold">
            <span>{{ lender.paidFmt }}</span>
            <span class="text-[#9aaba2]">{{ lender.pctLabel }}</span>
          </div>
          <UProgress
            :model-value="lender.pct"
            :max="100"
            :color="lender.progressColor"
            size="xs"
          />
        </div>
      </template>
      <template #maturity-cell="{ row: { original: lender } }">
        {{ lender.maturityFmt }}
      </template>
      <template #status-cell="{ row: { original: lender } }">
        <div class="flex items-center gap-2">
          <StatusBadge :status="lender.status" />
          <UButton
            v-if="canClaimRefund && isConnectedLender(lender.address) && lender.principal > 0"
            size="xs"
            color="warning"
            variant="soft"
            label="Claim refund"
            icon="heroicons:arrow-uturn-left"
            :loading="claimRefundIsPending && claimingLenderAddress === lender.address"
            data-test="lender-claim-refund-button"
            @click="$emit('claim-refund', lender.address)"
          />
        </div>
      </template>
      <template #loading>
        <div data-test="lenders-loading" class="flex flex-col gap-2 p-5">
          <USkeleton v-for="index in 3" :key="index" class="h-10 w-full" />
        </div>
      </template>
      <template #empty>
        <UEmpty
          v-if="partners.length === 0"
          data-test="lenders-empty"
          icon="heroicons:user-group"
          title="No lenders yet."
        />
        <UEmpty
          v-else
          data-test="lenders-no-match"
          icon="heroicons:magnifying-glass"
          title="No matching lenders"
          :description="`No lenders match &quot;${lenderSearch}&quot;.`"
        />
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAddress, isAddressEqual } from 'viem'
import { useUserDataStore } from '@/stores'
import StatusBadge from './StatusBadge.vue'
import UserComponent from '@/components/UserComponent.vue'
import type { FixedReturnLenderRow } from '@/types'

const props = defineProps<{
  partners: FixedReturnLenderRow[]
  isLoading: boolean
  canClaimRefund: boolean
  claimRefundIsPending: boolean
  claimingLenderAddress: string | null
}>()

defineEmits<{ 'claim-refund': [address: string] }>()

const userStore = useUserDataStore()

const lenderColumns = [
  { accessorKey: 'lender', header: 'Lender' },
  { accessorKey: 'principal', header: 'Principal' },
  { accessorKey: 'rate', header: 'Rate' },
  { accessorKey: 'expected', header: 'Expected return' },
  { accessorKey: 'paid', header: 'Paid to date' },
  { accessorKey: 'maturity', header: 'Maturity' },
  { accessorKey: 'status', header: 'Status' }
]

const lenderSearch = ref('')

const filteredPartners = computed(() => {
  const query = lenderSearch.value.trim().toLowerCase()
  if (!query) return props.partners
  return props.partners.filter(
    (p) => p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
  )
})

function isConnectedLender(address: string) {
  return (
    isAddress(address, { strict: false }) &&
    isAddress(userStore.address, { strict: false }) &&
    isAddressEqual(address, userStore.address)
  )
}
</script>
