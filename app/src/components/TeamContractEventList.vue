<template>
  <TableComponent
    :rows="
      Object.entries(eventsByCampaignCode).map(([campaignCode, events]) => ({
        campaignCode,
        budget: getBudget(events),
        events,
        expanded: expandedCampaigns.includes(campaignCode)
      }))
    "
    :columns="[
      { key: 'campaignCode', label: 'Campaign Code' },
      { key: 'budget', label: 'Budget (POL)' },
      { key: 'details', label: 'Details' }
    ]"
  >
    <template #campaignCode-data="{ row }">
      <span class="campaign-code font-bold">{{ row.campaignCode }}</span>
    </template>

    <template #budget-data="{ row }">
      <span class="campaign-budget">{{ row.budget }} POL</span>
    </template>

    <template #details-data="{ row }">
      <input
        type="checkbox"
        :checked="row.expanded"
        @change="toggleCampaign(row.campaignCode)"
        class="toggle"
      />
      <div v-if="row.expanded">
        <ul>
          <li
            v-for="event in row.events.slice(1)"
            :key="event.eventName + event.campaignCode"
            class="py-2"
          >
            <div v-if="event.eventName === 'PaymentReleased'">
              <span class="font-semibold">Payment Released:</span> {{ event.paymentAmount }} POL
            </div>
            <div v-if="event.eventName === 'BudgetWithdrawn'">
              <span class="font-semibold">Budget Withdrawn:</span> {{ event.amount }} POL by
              {{ event.advertiser }}
            </div>
            <div v-if="event.eventName === 'PaymentReleasedOnWithdrawApproval'">
              <span class="font-semibold">Payment Released on Approval:</span>
              {{ event.paymentAmount }} POL
            </div>
          </li>
        </ul>
      </div>
    </template>
  </TableComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EventsByCampaignCode, ExtendedEvent } from '@/services/AddCampaignService'
import TableComponent from '@/components/TableComponent.vue'
// Props
defineProps<{
  eventsByCampaignCode: EventsByCampaignCode
}>()

// Track expanded campaigns
const expandedCampaigns = ref<string[]>([])

// Toggle the display of campaign details
const toggleCampaign = (campaignCode: string | number) => {
  if (expandedCampaigns.value.includes(String(campaignCode))) {
    expandedCampaigns.value = expandedCampaigns.value.filter((code) => code !== campaignCode)
  } else {
    expandedCampaigns.value.push(String(campaignCode))
  }
}

// Get the budget for the campaign (first event)
const getBudget = (events: Array<ExtendedEvent>): string => {
  const adCampaignCreatedEvent = events.find((event) => event.eventName === 'AdCampaignCreated')
  return adCampaignCreatedEvent ? String(adCampaignCreatedEvent.budget) : 'N/A'
}
</script>
