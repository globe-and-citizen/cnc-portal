<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <UButton
      :color="target.category ? 'primary' : 'neutral'"
      :variant="target.category ? 'subtle' : 'outline'"
      size="md"
      class="justify-between gap-2 font-medium"
      :trailing-icon="open ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
      data-test="ledger-classify-trigger"
    >
      {{ triggerLabel }}
    </UButton>

    <template #content>
      <div class="flex w-64 flex-col gap-3 p-3">
        <p class="text-muted text-xs">Classify this withdrawal</p>
        <USelect
          v-model="selected"
          :items="categoryOptions"
          value-key="value"
          placeholder="Choose a category"
          size="sm"
          data-test="ledger-classify-select"
          :disabled="saving || removing"
        />
        <UTextarea
          v-model="memoDraft"
          :rows="2"
          placeholder="Optional note"
          size="sm"
          :maxlength="500"
          :disabled="saving || removing"
          data-test="ledger-classify-memo"
        />
        <div class="flex items-center justify-between gap-2">
          <UButton
            v-if="target.category"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="removing"
            :disabled="saving || removing"
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
            :disabled="!selected || saving || removing"
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
import { useToast } from '@nuxt/ui/composables'
import {
  ALLOWED_BY_DIRECTION,
  CATEGORY_LABEL,
  type ClassificationCategory
} from '@/utils/accounting/classification'
import type { LegacyClassificationTarget } from '@/utils/accounting/classificationTarget'
import {
  useUpsertClassificationMutation,
  useDeleteClassificationMutation
} from '@/queries/classification.queries'

const props = defineProps<{
  /** The exact legacy mutation key and saved decision, provided by journal assembly. */
  target: LegacyClassificationTarget
  teamId: string
}>()

/** The categories a user can pick — internal transfers are auto-detected, never manual. */
type ExternalCategory = Exclude<ClassificationCategory, 'INTERNAL_TRANSFER'>

const toast = useToast()
const open = ref(false)
const selected = ref<ExternalCategory | undefined>(
  props.target.category as ExternalCategory | undefined
)
const memoDraft = ref<string>(props.target.memo ?? '')

/** Re-seed the form when the underlying classification changes (a refetch after a save). */
watch(
  () => [props.target.sourceEntryId, props.target.category, props.target.memo] as const,
  ([, category, memo]) => {
    selected.value = category as ExternalCategory | undefined
    memoDraft.value = memo ?? ''
  }
)

const categoryOptions = computed(() =>
  ALLOWED_BY_DIRECTION.out
    .filter((category): category is ExternalCategory => category !== 'INTERNAL_TRANSFER')
    .map((category) => ({ label: CATEGORY_LABEL[category], value: category }))
)

const triggerLabel = computed(() =>
  props.target.category ? CATEGORY_LABEL[props.target.category] : 'Inferred'
)

const upsert = useUpsertClassificationMutation()
const remove = useDeleteClassificationMutation()
const saving = computed(() => upsert.isPending.value)
const removing = computed(() => remove.isPending.value)

function save(): void {
  if (!selected.value || saving.value || removing.value) return
  upsert.mutate(
    {
      body: {
        teamId: props.teamId,
        txId: props.target.sourceEntryId,
        category: selected.value,
        memo: memoDraft.value.trim() || undefined
      }
    },
    {
      onSuccess: () => {
        open.value = false
        toast.add({ title: 'Transaction classified', color: 'success' })
      },
      onError: () => toast.add({ title: 'Could not save the classification', color: 'error' })
    }
  )
}

function clear(): void {
  if (saving.value || removing.value) return
  remove.mutate(
    {
      queryParams: { teamId: props.teamId, txId: props.target.sourceEntryId }
    },
    {
      onSuccess: () => {
        open.value = false
        toast.add({ title: 'Reverted to the inferred classification', color: 'success' })
      },
      onError: () => toast.add({ title: 'Could not revert the classification', color: 'error' })
    }
  )
}
</script>
