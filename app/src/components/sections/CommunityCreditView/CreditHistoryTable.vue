<template>
  <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
    <table class="w-full border-collapse" data-test="credit-history-table">
      <thead>
        <tr class="bg-muted text-muted text-left text-xs font-semibold">
          <th class="px-4 py-3" style="width: 34%">Round</th>
          <th class="px-4 py-3">Status</th>
          <th class="px-4 py-3 text-right">Raised</th>
          <th class="px-4 py-3 text-right">Rate</th>
          <th class="px-4 py-3 text-right">Term</th>
          <th class="px-4 py-3 text-right">Outcome</th>
          <th class="px-4 py-3" style="width: 90px"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.round.id"
          class="border-default/60 hover:bg-muted/60 cursor-pointer border-t transition-colors"
          data-test="credit-history-row"
          @click="emit('select', row.round)"
        >
          <td class="px-4 py-3.5">
            <div class="flex items-center gap-3">
              <span
                class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg"
                :class="row.iconClass"
              >
                <UIcon :name="row.icon" class="size-4" />
              </span>
              <div class="min-w-0">
                <div class="text-sm font-semibold">{{ row.round.name }}</div>
                <div class="text-muted max-w-[320px] truncate text-xs">{{ row.round.desc }}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3.5">
            <UBadge :color="row.status.color" variant="subtle" :label="row.status.label" />
          </td>
          <td class="px-4 py-3.5 text-right font-bold">{{ row.raised }}</td>
          <td class="px-4 py-3.5 text-right font-mono text-sm">{{ row.round.rate }}%</td>
          <td class="text-muted px-4 py-3.5 text-right">{{ row.round.period }}d</td>
          <td class="text-muted px-4 py-3.5 text-right">{{ row.outcome }}</td>
          <td class="px-4 py-3.5 text-right">
            <UButton
              :variant="row.draft ? 'soft' : 'ghost'"
              :color="row.draft ? 'primary' : 'neutral'"
              size="sm"
              :label="row.cta"
              @click.stop="onCtaClick(row.round, row.draft)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommunityCreditStore } from '@/stores'
import { formatAmount, statusMeta } from '@/utils'
import type { CreditRound } from '@/types'

const emit = defineEmits<{ select: [round: CreditRound]; continue: [round: CreditRound] }>()

const store = useCommunityCreditStore()

const rows = computed(() =>
  store.historyRounds.map((round) => {
    const draft = round.status === 'draft'
    return {
      round,
      draft,
      status: statusMeta(round.status),
      raised: draft ? '—' : formatAmount(round.raised),
      outcome: draft ? 'Not launched' : `Repaid ${round.repaidOn}`,
      icon: draft ? 'heroicons:pencil-square' : 'heroicons:check-badge',
      iconClass: draft ? 'bg-muted text-muted' : 'bg-success/10 text-success',
      cta: draft && store.isOwner ? 'Continue' : 'View'
    }
  })
)

function onCtaClick(round: CreditRound, draft: boolean) {
  if (draft) emit('continue', round)
  else emit('select', round)
}
</script>
