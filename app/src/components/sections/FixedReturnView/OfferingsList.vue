<template>
  <UCard :ui="{ body: 'p-0' }">
    <template #header>
      <div class="text-base font-extrabold text-[#0f3d2e]">
        Offerings <span class="text-sm font-semibold text-[#9aaba2]">· {{ offerings.length }}</span>
      </div>
    </template>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse" style="min-width: 820px">
        <thead>
          <tr class="bg-[#f7faf8]">
            <th class="text-left text-xs font-bold text-[#81948a] uppercase tracking-wide px-5 py-3">Offering</th>
            <th class="text-right text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3">Rate</th>
            <th class="text-right text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3">Term</th>
            <th class="text-left text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3">Access</th>
            <th class="text-left text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3" style="min-width: 180px">Raised</th>
            <th class="text-left text-xs font-bold text-[#81948a] uppercase tracking-wide px-4 py-3">Status</th>
            <th class="text-right text-xs font-bold text-[#81948a] uppercase tracking-wide px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in offerings"
            :key="o.id"
            data-test="offering-row"
            class="border-t border-[#f0f4f1] hover:bg-[#f7fbf9] transition-colors"
          >
            <td class="px-5 py-4 text-sm font-bold text-[#0f3d2e]">{{ o.title }}</td>
            <td class="px-4 py-4 text-right text-sm font-bold text-[#0f3d2e] whitespace-nowrap">{{ o.rate }}%</td>
            <td class="px-4 py-4 text-right text-sm font-semibold text-[#0f3d2e] whitespace-nowrap">{{ o.term }} mo</td>
            <td class="px-4 py-4">
              <UBadge :color="o.access === 'whitelist' ? 'info' : 'success'" variant="soft" size="xs">
                {{ o.access === 'whitelist' ? 'Whitelist' : 'Open to all' }}
              </UBadge>
            </td>
            <td class="px-4 py-4">
              <div class="flex justify-between text-xs font-semibold mb-1.5">
                <span class="text-[#7d8e84]">{{ moneyShort(o.raised) }}</span>
                <span class="text-[#9aaba2]">of {{ moneyShort(o.target) }} · {{ pct(o) }}%</span>
              </div>
              <div class="h-1.5 rounded-full bg-[#eef3f0] overflow-hidden">
                <div class="h-full rounded-full bg-primary" :style="{ width: pct(o) + '%' }"></div>
              </div>
            </td>
            <td class="px-4 py-4">
              <StatusBadge :status="o.status" />
            </td>
            <td class="px-5 py-4 text-right">
              <UButton
                size="sm"
                color="primary"
                variant="soft"
                label="Manage"
                trailing-icon="heroicons:arrow-right"
                data-test="offering-manage-button"
                @click="$emit('manage', o)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import StatusBadge from './StatusBadge.vue'
import { moneyShort, type OfferingSummary } from './offeringForm'

defineEmits<{ manage: [offering: OfferingSummary] }>()

const offerings: OfferingSummary[] = [
  { id: 'riverside', title: 'Riverside Expansion Note', rate: 9, term: 12, startDate: '2025-06-15', access: 'general', raised: 520000, target: 500000, status: 'closed' },
  { id: 'mill-street', title: 'Mill Street Solar Array', rate: 8.5, term: 18, startDate: '2026-01-01', access: 'whitelist', raised: 150000, target: 300000, status: 'open' },
  { id: 'harbor-logistics', title: 'Harbor Logistics Facility', rate: 10, term: 24, startDate: '2026-03-01', access: 'general', raised: 80000, target: 750000, status: 'open' }
]

function pct(o: OfferingSummary): number {
  return Math.min(100, Math.round((o.raised / o.target) * 100))
}
</script>
