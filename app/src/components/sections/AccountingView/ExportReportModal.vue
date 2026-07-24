<template>
  <UModal
    v-model:open="open"
    title="Export report"
    description="Pick the sections to include in the PDF report."
    :ui="{ content: 'rounded-2xl' }"
  >
    <UButton
      color="neutral"
      variant="soft"
      icon="i-heroicons-document-arrow-down"
      label="Export report"
      data-test="open-export-report"
      @click="open = true"
    />

    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <p class="text-muted text-sm">Sections are printed on separate pages.</p>
          <div class="flex items-center gap-3 text-sm">
            <button
              type="button"
              class="text-primary hover:underline"
              data-test="select-all"
              @click="setAll(true)"
            >
              Select all
            </button>
            <button
              type="button"
              class="text-primary hover:underline"
              data-test="deselect-all"
              @click="setAll(false)"
            >
              Deselect all
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label
            v-for="section in SECTIONS"
            :key="section.key"
            class="hover:bg-elevated/50 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2"
            :data-test="`section-${section.key}`"
          >
            <UCheckbox v-model="checked[section.key]" />
            <span class="text-sm font-medium">{{ section.label }}</span>
            <UBadge
              v-if="section.key === 'ledger'"
              color="primary"
              variant="subtle"
              size="sm"
              :label="`${ledgerEntryCount} entries`"
              class="ml-auto"
            />
          </label>
        </div>

        <div class="flex flex-wrap justify-end gap-2">
          <UButton color="neutral" variant="ghost" data-test="cancel-export" @click="open = false">
            Cancel
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-arrow-down-tray"
            :disabled="selectedKeys.length === 0"
            data-test="generate-excel"
            @click="generate('excel')"
          >
            Export to Excel
          </UButton>
          <UButton
            color="neutral"
            icon="i-heroicons-printer"
            :disabled="selectedKeys.length === 0"
            data-test="generate-pdf"
            @click="generate('pdf')"
          >
            Export to PDF
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import type { SectionKey } from '@/utils/accounting/exportSpec'

/** Which file the selected sections are exported as. */
export type ExportFormat = 'pdf' | 'excel'

defineProps<{ ledgerEntryCount: number }>()
const emit = defineEmits<{ generate: [payload: { format: ExportFormat; keys: SectionKey[] }] }>()

/** The report sections, in the order they print. */
const SECTIONS: ReadonlyArray<{ key: SectionKey; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'income', label: 'Income Statement' },
  { key: 'balance', label: 'Balance Sheet' },
  { key: 'trial', label: 'Trial Balance' },
  { key: 'ledger', label: 'General Ledger' }
]

const open = ref(false)

// All sections included by default.
const checked = reactive<Record<SectionKey, boolean>>({
  summary: true,
  income: true,
  balance: true,
  trial: true,
  ledger: true
})

const selectedKeys = computed(() => SECTIONS.filter((s) => checked[s.key]).map((s) => s.key))

function setAll(value: boolean): void {
  for (const section of SECTIONS) checked[section.key] = value
}

function generate(format: ExportFormat): void {
  emit('generate', { format, keys: selectedKeys.value })
  open.value = false
}
</script>
