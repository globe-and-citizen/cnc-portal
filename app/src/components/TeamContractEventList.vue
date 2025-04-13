<template>
  <table class="table w-full">
    <thead>
      <tr>
        <th class="px-4 py-2">Campaign Code</th>
        <th class="px-4 py-2">Budget (POL)</th>
        <th class="px-4 py-2">Details</th>
      </tr>
    </thead>
    <tbody>
      <div v-if="Object.keys(eventsByCampaignCode).length > 0">
        <tr
          v-for="(events, campaignCode) in eventsByCampaignCode"
          :key="campaignCode"
          class="campaign-item"
        >
          <!-- First level: Display campaign code and budget with expandable functionality -->
          <td class="border px-4 py-2">
            <span class="campaign-code font-bold">{{ campaignCode }}</span>
          </td>
          <td class="border px-4 py-2">
            <span class="campaign-budget">{{ getBudget(events) }} POL</span>
          </td>
          <td class="border px-4 py-2">
            <input type="checkbox" @change="toggleCampaign(String(campaignCode))" class="toggle" />
            <div v-if="expandedCampaigns.includes(String(campaignCode))">
              <!-- Second level: Display detailed events if the campaign is expanded -->
              <ul>
                <li
                  v-for="event in events.slice(1)"
                  :key="event.eventName + event.campaignCode"
                  class="py-2"
                >
                  <!-- Display event details based on the event type -->
                  <div v-if="event.eventName === 'PaymentReleased'">
                    <span class="font-semibold">Payment Released:</span>
                    {{ event.paymentAmount }} POL
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
          </td>
        </tr>
      </div>
      <div v-else>
        <tr>
          <td colspan="3" class="text-center py-4">
            <p>No events available for this campaign.</p>
          </td>
        </tr>
      </div>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EventsByCampaignCode, ExtendedEvent } from '@/services/AddCampaignService'
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
