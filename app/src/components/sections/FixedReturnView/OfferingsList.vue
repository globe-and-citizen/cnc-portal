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
            <th
              class="px-5 py-3 text-left text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Offering
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Rate
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Term
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Access
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-bold tracking-wide text-[#81948a] uppercase"
              style="min-width: 180px"
            >
              Raised
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-bold tracking-wide text-[#81948a] uppercase"
            >
              Status
            </th>
            <th
              class="px-5 py-3 text-right text-xs font-bold tracking-wide text-[#81948a] uppercase"
            ></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="o in offerings"
            :key="o.id"
            data-test="offering-row"
            class="border-t border-[#f0f4f1] transition-colors hover:bg-[#f7fbf9]"
          >
            <td class="px-5 py-4 text-sm font-bold text-[#0f3d2e]">{{ o.title }}</td>
            <td class="px-4 py-4 text-right text-sm font-bold whitespace-nowrap text-[#0f3d2e]">
              {{ o.rate }}%
            </td>
            <td class="px-4 py-4 text-right text-sm font-semibold whitespace-nowrap text-[#0f3d2e]">
              {{ o.term }} mo
            </td>
            <td class="px-4 py-4">
              <UBadge
                :color="o.access === 'whitelist' ? 'info' : 'success'"
                variant="soft"
                size="xs"
              >
                {{ o.access === 'whitelist' ? 'Whitelist' : 'Open to all' }}
              </UBadge>
            </td>
            <td class="px-4 py-4">
              <div class="mb-1.5 flex justify-between text-xs font-semibold">
                <span class="text-[#7d8e84]">{{ moneyShort(o.raised) }}</span>
                <span class="text-[#9aaba2]">of {{ moneyShort(o.target) }} · {{ pct(o) }}%</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-[#eef3f0]">
                <div class="bg-primary h-full rounded-full" :style="{ width: pct(o) + '%' }"></div>
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
  {
    id: 'riverside',
    title: 'Riverside Expansion Note',
    rate: 9,
    term: 12,
    startDate: '2025-06-15',
    access: 'general',
    raised: 520000,
    target: 500000,
    status: 'closed'
  },
  {
    id: 'mill-street',
    title: 'Mill Street Solar Array',
    rate: 8.5,
    term: 18,
    startDate: '2026-01-01',
    access: 'whitelist',
    raised: 150000,
    target: 300000,
    status: 'open'
  },
  {
    id: 'harbor-logistics',
    title: 'Harbor Logistics Facility',
    rate: 10,
    term: 24,
    startDate: '2026-03-01',
    access: 'general',
    raised: 80000,
    target: 750000,
    status: 'open'
  }
]

function pct(o: OfferingSummary): number {
  return Math.min(100, Math.round((o.raised / o.target) * 100))
}
</script>
