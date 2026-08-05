<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import {
  useAdvertisingCampaigns,
  useCampaignEventsByCode,
  type AdvertisingCampaign
} from '@/composables/campaign/reads'
import { formatTokenUnits } from '@/utils/format'
import AddressToolTip from '@/components/ui/AddressToolTip.vue'
import CreateAdvertisingCampaign from './forms/CreateAdvertisingCampaign.vue'
import WithdrawAdvertisingCampaign from './forms/WithdrawAdvertisingCampaign.vue'
import AdvertisingCampaignDetailsSlideover from './AdvertisingCampaignDetailsSlideover.vue'
import AdvertisingCampaignSummary from './AdvertisingCampaignSummary.vue'
const props = defineProps<{ managerAddress: Address }>()
const statusFilter = ref<'all' | 'active' | 'completed'>('all')
const search = ref('')
const createDialogOpen = ref(false)
const detailsCampaign = ref<AdvertisingCampaign | null>(null)
const withdrawCampaign = ref<AdvertisingCampaign | null>(null)
const address = computed(() => props.managerAddress)
const campaignsQuery = useAdvertisingCampaigns(address)
const eventsQuery = useCampaignEventsByCode(address)
const campaigns = computed(() => campaignsQuery.data.value ?? [])
const activeCount = computed(
  () => campaigns.value.filter((campaign) => campaign.status === 'active').length
)
const totalBudget = computed(() =>
  campaigns.value.reduce((total, campaign) => total + campaign.budget, 0n)
)
const availableBudget = computed(() =>
  campaigns.value.reduce((total, campaign) => total + campaign.remainingBudget, 0n)
)
const filteredCampaigns = computed(() => {
  const query = search.value.trim().toLowerCase()
  return campaigns.value.filter((campaign) => {
    const matchesStatus = statusFilter.value === 'all' || campaign.status === statusFilter.value
    const matchesSearch =
      !query ||
      campaign.code.toLowerCase().includes(query) ||
      campaign.advertiser.toLowerCase().includes(query)
    return matchesStatus && matchesSearch
  })
})
const statusOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' }
]
const columns = [
  { accessorKey: 'code', header: 'Campaign' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'budget', header: 'Budget' },
  { accessorKey: 'spent', header: 'Spent' },
  { accessorKey: 'remaining', header: 'Remaining' },
  { accessorKey: 'advertiser', header: 'Advertiser' },
  { accessorKey: 'actions', header: '' }
]
function progress(campaign: AdvertisingCampaign) {
  if (campaign.budget === 0n) return 0
  return Number((campaign.amountSpent * 10_000n) / campaign.budget) / 10_000
}
function activityFor(campaign: AdvertisingCampaign) {
  return eventsQuery.data.value?.[campaign.code] ?? []
}
function refresh() {
  campaignsQuery.refetch()
  eventsQuery.refetch()
}
</script>

<template>
  <section class="space-y-5" aria-label="Advertising campaigns">
    <AdvertisingCampaignSummary
      :active-count="activeCount"
      :total-budget="totalBudget"
      :available-budget="availableBudget"
    />
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-highlighted font-semibold">Funded campaigns</h3>
        <p class="text-muted mt-1 text-sm">
          Track budget consumption and recover unused campaign funds.
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        label="Create campaign"
        @click="createDialogOpen = true"
      />
    </div>
    <div v-if="campaigns.length" class="flex flex-col gap-2 sm:flex-row">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search campaign or advertiser"
        aria-label="Search campaigns"
        class="sm:max-w-sm sm:flex-1"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        aria-label="Filter campaigns by status"
        class="sm:w-44"
      />
    </div>
    <div v-if="campaignsQuery.isPending.value" class="space-y-3" data-test="campaigns-loading">
      <USkeleton v-for="index in 3" :key="index" class="h-16 w-full" />
    </div>
    <UAlert
      v-else-if="campaignsQuery.isError.value"
      color="error"
      variant="soft"
      icon="i-lucide-cloud-off"
      title="Campaigns could not be loaded"
      description="Check the selected network and try again."
      :actions="[{ label: 'Retry', color: 'error', variant: 'outline', onClick: refresh }]"
      data-test="campaigns-error"
    />
    <UEmpty
      v-else-if="!campaigns.length"
      variant="naked"
      icon="i-lucide-megaphone"
      title="No funded campaigns yet"
      description="Create the first campaign and choose the budget available for advertising activity."
      :actions="[
        {
          label: 'Create campaign',
          icon: 'i-lucide-plus',
          color: 'primary',
          onClick: () => {
            createDialogOpen = true
          }
        }
      ]"
      data-test="campaigns-empty"
    />
    <UEmpty
      v-else-if="!filteredCampaigns.length"
      variant="naked"
      icon="i-lucide-search-x"
      title="No matching campaigns"
      description="Change the search or status filter to see other campaigns."
    />
    <template v-else>
      <UTable class="hidden md:table" :data="filteredCampaigns" :columns="columns">
        <template #code-cell="{ row: { original: campaign } }">
          <div>
            <p class="text-highlighted font-medium">{{ campaign.code }}</p>
            <p class="text-muted mt-1 text-xs">Campaign #{{ campaign.id }}</p>
          </div>
        </template>
        <template #status-cell="{ row: { original: campaign } }">
          <UBadge
            :color="campaign.status === 'active' ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ campaign.status === 'active' ? 'Active' : 'Completed' }}
          </UBadge>
        </template>
        <template #budget-cell="{ row: { original: campaign } }">
          {{ formatTokenUnits(campaign.budget, 18, 'POL') }}
        </template>
        <template #spent-cell="{ row: { original: campaign } }">
          <div class="min-w-28">
            <span>{{ formatTokenUnits(campaign.amountSpent, 18, 'POL') }}</span>
            <UProgress :model-value="progress(campaign) * 100" size="xs" class="mt-2" />
          </div>
        </template>
        <template #remaining-cell="{ row: { original: campaign } }">
          {{ formatTokenUnits(campaign.remainingBudget, 18, 'POL') }}
        </template>
        <template #advertiser-cell="{ row: { original: campaign } }">
          <AddressToolTip :address="campaign.advertiser" :slice="true" class="text-xs" />
        </template>
        <template #actions-cell="{ row: { original: campaign } }">
          <UDropdownMenu
            :items="[
              {
                label: 'View campaign',
                icon: 'i-lucide-panel-right-open',
                onSelect: () => (detailsCampaign = campaign)
              },
              ...(campaign.status === 'active'
                ? [
                    {
                      label: 'Withdraw remaining budget',
                      icon: 'i-lucide-circle-dollar-sign',
                      color: 'warning' as const,
                      onSelect: () => (withdrawCampaign = campaign)
                    }
                  ]
                : [])
            ]"
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-ellipsis-vertical"
              aria-label="Campaign actions"
            />
          </UDropdownMenu>
        </template>
      </UTable>
      <div class="space-y-3 md:hidden">
        <UCard v-for="campaign in filteredCampaigns" :key="campaign.code" variant="subtle">
          <div class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-highlighted font-medium break-all">{{ campaign.code }}</p>
                <AddressToolTip :address="campaign.advertiser" :slice="true" class="mt-1 text-xs" />
              </div>
              <UBadge
                :color="campaign.status === 'active' ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ campaign.status === 'active' ? 'Active' : 'Completed' }}
              </UBadge>
            </div>
            <dl class="grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt class="text-muted">Budget</dt>
                <dd class="text-highlighted mt-1 font-medium">
                  {{ formatTokenUnits(campaign.budget, 18, 'POL') }}
                </dd>
              </div>
              <div>
                <dt class="text-muted">Spent</dt>
                <dd class="text-highlighted mt-1 font-medium">
                  {{ formatTokenUnits(campaign.amountSpent, 18, 'POL') }}
                </dd>
              </div>
              <div>
                <dt class="text-muted">Available</dt>
                <dd class="text-highlighted mt-1 font-medium">
                  {{ formatTokenUnits(campaign.remainingBudget, 18, 'POL') }}
                </dd>
              </div>
            </dl>
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="outline"
                label="View details"
                class="flex-1"
                @click="detailsCampaign = campaign"
              />
              <UButton
                v-if="campaign.status === 'active'"
                color="warning"
                variant="soft"
                label="Withdraw"
                class="flex-1"
                @click="withdrawCampaign = campaign"
              />
            </div>
          </div>
        </UCard>
      </div>
    </template>
    <UModal
      v-model:open="createDialogOpen"
      title="Create advertising campaign"
      description="Fund a new campaign through the selected Campaign Manager."
    >
      <template #body>
        <CreateAdvertisingCampaign
          :manager-address="managerAddress"
          @close="createDialogOpen = false"
          @created="refresh"
        />
      </template>
    </UModal>
    <UModal
      :open="!!withdrawCampaign"
      title="Withdraw remaining campaign budget"
      :description="withdrawCampaign ? `Review the final spend for ${withdrawCampaign.code}.` : ''"
      @update:open="(open) => !open && (withdrawCampaign = null)"
    >
      <template #body>
        <WithdrawAdvertisingCampaign
          v-if="withdrawCampaign"
          :manager-address="managerAddress"
          :campaign="withdrawCampaign"
          @close="withdrawCampaign = null"
          @withdrawn="refresh"
        />
      </template>
    </UModal>
    <AdvertisingCampaignDetailsSlideover
      :campaign="detailsCampaign"
      :events="detailsCampaign ? activityFor(detailsCampaign) : []"
      @close="detailsCampaign = null"
      @withdraw="(campaign) => (withdrawCampaign = campaign)"
    />
  </section>
</template>
