<script setup lang="ts">
import type { AdvertisingCampaign } from '@/composables/campaign/reads'
import type { ExtendedEvent } from '@/lib/campaign/events'
import { formatPercent, formatTokenUnits } from '@/utils/format'
import AddressToolTip from '@/components/AddressToolTip.vue'

defineProps<{
  campaign: AdvertisingCampaign | null
  events: ExtendedEvent[]
}>()
const emit = defineEmits<{ close: []; withdraw: [campaign: AdvertisingCampaign] }>()

function progress(campaign: AdvertisingCampaign) {
  if (campaign.budget === 0n) return 0
  return Number((campaign.amountSpent * 10_000n) / campaign.budget) / 10_000
}

function eventLabel(eventName: ExtendedEvent['eventName']) {
  return eventName.replace(/([A-Z])/g, ' $1').trim()
}
</script>

<template>
  <USlideover
    :open="!!campaign"
    title="Campaign details"
    description="Budget, advertiser and on-chain activity for this campaign."
    :ui="{ content: 'sm:max-w-xl' }"
    @update:open="(open) => !open && emit('close')"
  >
    <template #body>
      <div v-if="campaign" class="space-y-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-highlighted text-lg font-semibold break-all">{{ campaign.code }}</p>
            <p class="text-muted mt-1 text-sm">Campaign #{{ campaign.id }}</p>
          </div>
          <UBadge :color="campaign.status === 'active' ? 'success' : 'neutral'" variant="subtle">
            {{ campaign.status === 'active' ? 'Active' : 'Completed' }}
          </UBadge>
        </div>

        <dl class="grid grid-cols-2 gap-3">
          <div class="bg-elevated rounded-lg p-3">
            <dt class="text-muted text-sm">Budget</dt>
            <dd class="text-highlighted mt-1 font-semibold">
              {{ formatTokenUnits(campaign.budget, 18, 'POL') }}
            </dd>
          </div>
          <div class="bg-elevated rounded-lg p-3">
            <dt class="text-muted text-sm">Remaining</dt>
            <dd class="text-highlighted mt-1 font-semibold">
              {{ formatTokenUnits(campaign.remainingBudget, 18, 'POL') }}
            </dd>
          </div>
        </dl>

        <div>
          <div class="flex justify-between text-sm">
            <span class="text-muted">Budget consumed</span>
            <span class="text-highlighted font-medium">{{
              formatPercent(progress(campaign))
            }}</span>
          </div>
          <UProgress :model-value="progress(campaign) * 100" class="mt-2" />
        </div>

        <div>
          <p class="text-muted mb-2 text-sm">Advertiser</p>
          <AddressToolTip :address="campaign.advertiser" :slice="false" />
        </div>

        <USeparator />

        <div>
          <h3 class="text-highlighted font-semibold">On-chain activity</h3>
          <div v-if="events.length" class="mt-3 space-y-3">
            <div
              v-for="(event, index) in events"
              :key="`${event.eventName}-${index}`"
              class="border-default flex gap-3 border-l-2 py-1 pl-4"
            >
              <UIcon name="i-lucide-circle-check" class="text-primary mt-0.5 size-4" />
              <div>
                <p class="text-highlighted text-sm font-medium">
                  {{ eventLabel(event.eventName) }}
                </p>
                <p class="text-muted mt-1 text-xs">Recorded on-chain</p>
              </div>
            </div>
          </div>
          <UEmpty
            v-else
            variant="naked"
            icon="i-lucide-activity"
            title="No activity recorded"
            description="Campaign transactions will appear here."
          />
        </div>

        <UButton
          v-if="campaign.status === 'active'"
          color="warning"
          variant="soft"
          icon="i-lucide-circle-dollar-sign"
          label="Withdraw remaining budget"
          block
          @click="emit('withdraw', campaign)"
        />
      </div>
    </template>
  </USlideover>
</template>
