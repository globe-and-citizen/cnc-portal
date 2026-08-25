<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <UButton
      :color="category ? 'primary' : 'neutral'"
      :variant="category ? 'subtle' : 'outline'"
      size="md"
      class="justify-between gap-2 font-medium"
      :trailing-icon="open ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
      data-test="ledger-classify-trigger"
    >
      {{ triggerLabel }}
    </UButton>

    <template #content>
      <div class="flex w-64 flex-col gap-3 p-3">
        <p class="text-muted text-xs">
          Classify this {{ direction === 'in' ? 'deposit' : 'withdrawal' }}
        </p>
        <USelect
          v-model="selected"
          :items="categoryOptions"
          value-key="value"
          placeholder="Choose a category"
          size="sm"
          data-test="ledger-classify-select"
        />
        <UTextarea
          v-model="memoDraft"
          :rows="2"
          placeholder="Optional note"
          size="sm"
          :maxlength="500"
        />
        <div class="flex items-center justify-between gap-2">
          <UButton
            v-if="category"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="removing"
            data-test="ledger-classify-clear"
            @click="clear"
          >
            Revert to inferred
          </UButton>
          <span v-else />
          <UButton
            color="primary"
            size="xs"
            :loading="saving"
            :disabled="!selected"
            data-test="ledger-classify-save"
            @click="save"
          >
            Save
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ALLOWED_BY_DIRECTION,
  CATEGORY_LABEL,
  type ClassificationCategory,
  type ClassificationDirection
} from '@/utils/accounting/classification'
import {
  useUpsertClassificationMutation,
  useDeleteClassificationMutation
} from '@/queries/classification.queries'

const props = defineProps<{
  /** The stable transaction identity `${txHash}-${logIndex}` to classify. */
  entryId: string
  direction: ClassificationDirection
  teamId: string
  /** The currently applied category, when the transaction is already classified. */
  category?: ClassificationCategory
  /** The note carried by an already-classified transaction, so an edit preserves it. */
  memo?: string
}>()

/** The categories a user can pick — internal transfers are auto-detected, never manual. */
type ExternalCategory = Exclude<ClassificationCategory, 'INTERNAL_TRANSFER'>

const toast = useToast()
const open = ref(false)
const selected = ref<ExternalCategory | undefined>(props.category as ExternalCategory | undefined)
const memoDraft = ref<string>(props.memo ?? '')

/** Re-seed the form when the underlying classification changes (a refetch after a save). */
watch(
  () => [props.category, props.memo] as const,
  ([category, memo]) => {
    selected.value = category as ExternalCategory | undefined
    memoDraft.value = memo ?? ''
  }
)

const categoryOptions = computed(() =>
  ALLOWED_BY_DIRECTION[props.direction]
    .filter((category): category is ExternalCategory => category !== 'INTERNAL_TRANSFER')
    .map((category) => ({ label: CATEGORY_LABEL[category], value: category }))
)

const triggerLabel = computed(() => (props.category ? CATEGORY_LABEL[props.category] : 'Inferred'))

const upsert = useUpsertClassificationMutation()
const remove = useDeleteClassificationMutation()
const saving = computed(() => upsert.isPending.value)
const removing = computed(() => remove.isPending.value)

async function save(): Promise<void> {
  if (!selected.value) return
  try {
    await upsert.mutateAsync({
      body: {
        teamId: props.teamId,
        txId: props.entryId,
        category: selected.value,
        memo: memoDraft.value.trim() || undefined
      }
    })
    open.value = false
    toast.add({ title: 'Transaction classified', color: 'success' })
  } catch {
    toast.add({ title: 'Could not save the classification', color: 'error' })
  }
}

async function clear(): Promise<void> {
  try {
    await remove.mutateAsync({
      queryParams: { teamId: props.teamId, txId: props.entryId }
    })
    open.value = false
    toast.add({ title: 'Reverted to the inferred classification', color: 'success' })
  } catch {
    toast.add({ title: 'Could not revert the classification', color: 'error' })
  }
}
</script>
