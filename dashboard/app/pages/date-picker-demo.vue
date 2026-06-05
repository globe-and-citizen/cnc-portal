<script setup lang="ts">
import type { Range } from '~/types'

/**
 * Dev playground for {@link AccountingDatePicker} (issue #2051).
 *
 * Public (see middleware/auth.global.ts) so the component can be exercised without signing in —
 * for QA and for whoever wires the picker into the report pages. Not linked from the nav.
 */
definePageMeta({ layout: 'blank' })
useHead({ title: 'Date picker — demo' })

const asOf = ref<Date>()
const period = ref<Range>()

const iso = (d?: Date) => (d ? d.toISOString() : '—')
const unix = (d?: Date) => (d ? Math.floor(d.getTime() / 1000) : '—')
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-10 p-8">
    <header class="space-y-1">
      <h1 class="text-xl font-semibold text-highlighted">
        AccountingDatePicker — demo
      </h1>
      <p class="text-sm text-muted">
        Playground for the dual-mode date picker. Try the presets, the ◀ / ▶ steppers, the
        Specific-date calendar and the Custom-dates range. The value emitted through
        <code>v-model</code> is shown live under each picker.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-xs font-medium uppercase tracking-wide text-muted">
        mode="date" — emits a single <code>Date</code>
      </h2>
      <AccountingDatePicker v-model="asOf" mode="date" />
      <dl class="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
        <dt class="text-muted">
          ISO
        </dt>
        <dd class="tabular-nums">
          {{ iso(asOf) }}
        </dd>
        <dt class="text-muted">
          unix seconds
        </dt>
        <dd class="tabular-nums">
          {{ unix(asOf) }}
        </dd>
      </dl>
    </section>

    <section class="space-y-3">
      <h2 class="text-xs font-medium uppercase tracking-wide text-muted">
        mode="range" — emits <code>{ start, end }</code>
      </h2>
      <AccountingDatePicker v-model="period" mode="range" />
      <dl class="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
        <dt class="text-muted">
          start
        </dt>
        <dd class="tabular-nums">
          {{ iso(period?.start) }}
        </dd>
        <dt class="text-muted">
          end
        </dt>
        <dd class="tabular-nums">
          {{ iso(period?.end) }}
        </dd>
        <dt class="text-muted">
          unix
        </dt>
        <dd class="tabular-nums">
          {{ unix(period?.start) }} → {{ unix(period?.end) }}
        </dd>
      </dl>
    </section>

    <section class="space-y-2 rounded-md bg-elevated/50 p-4 text-sm">
      <h2 class="font-medium text-highlighted">
        Usage
      </h2>
      <pre class="overflow-x-auto text-xs text-muted"><code>&lt;AccountingDatePicker v-model="asOfDate" mode="date" /&gt;
&lt;AccountingDatePicker v-model="period" mode="range" /&gt;</code></pre>
    </section>
  </div>
</template>
