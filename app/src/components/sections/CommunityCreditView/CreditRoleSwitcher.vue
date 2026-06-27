<template>
  <div
    class="border-default bg-muted inline-flex items-center gap-2 rounded-full border py-0.5 pr-0.5 pl-3"
    data-test="credit-role-switcher"
  >
    <span class="text-muted text-[11px] font-semibold tracking-wide uppercase">View as</span>
    <div class="inline-flex gap-0.5">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        :class="pillClass(opt.value)"
        :data-test="`role-${opt.value}`"
        @click="store.setRole(opt.value)"
      >
        <UIcon :name="opt.icon" class="size-3.5" />
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCommunityCreditStore } from '@/stores'
import type { CreditRole } from '@/types'

const store = useCommunityCreditStore()

const options: { value: CreditRole; label: string; icon: string }[] = [
  { value: 'owner', label: 'Owner', icon: 'heroicons:shield-check' },
  { value: 'lender', label: 'Lender', icon: 'heroicons:hand-raised' }
]

function pillClass(value: CreditRole) {
  return [
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
    store.role === value ? 'bg-default text-primary shadow-xs' : 'text-muted hover:text-default'
  ]
}
</script>
