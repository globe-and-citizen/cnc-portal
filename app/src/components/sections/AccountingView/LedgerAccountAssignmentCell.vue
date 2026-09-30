<template>
  <UPopover v-model:open="open" :content="{ align: 'end' }">
    <UButton
      :color="target.accountId ? 'primary' : 'neutral'"
      :variant="target.accountId ? 'subtle' : 'outline'"
      size="md"
      class="justify-between gap-2 font-medium"
      :trailing-icon="open ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
      data-test="ledger-account-assignment-trigger"
    >
      {{ triggerLabel }}
    </UButton>

    <template #content>
      <div class="flex w-72 flex-col gap-3 p-3">
        <p class="text-muted text-xs">Assign the withdrawal counter-account</p>
        <USelect
          v-model="selected"
          :items="accountOptions"
          value-key="value"
          placeholder="Choose an account"
          size="sm"
          data-test="ledger-account-assignment-select"
          :disabled="saving || removing"
        />
        <UTextarea
          v-model="memoDraft"
          :rows="2"
          placeholder="Optional note"
          size="sm"
          :maxlength="500"
          :disabled="saving || removing"
          data-test="ledger-account-assignment-memo"
        />
        <div class="flex items-center justify-between gap-2">
          <UButton
            v-if="target.accountId"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="removing"
            :disabled="saving || removing"
            data-test="ledger-account-assignment-clear"
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
            data-test="ledger-account-assignment-save"
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
  useDeleteJournalAccountAssignmentMutation,
  useUpsertJournalAccountAssignmentMutation
} from '@/queries/journalAccountAssignment.queries'
import { accountFamilyById } from '@/utils/accounting/chartOfAccounts'
import { JOURNAL_ASSIGNABLE_ACCOUNTS } from '@/utils/accounting/journalAccountAssignment'
import type { JournalAccountAssignmentTarget } from '@/utils/accounting/journalAccountAssignmentPresenter'
import type { AccountId } from '@/utils/accounting/types'

const props = defineProps<{
  target: JournalAccountAssignmentTarget
  teamId: string
}>()

const toast = useToast()
const open = ref(false)
const selected = ref<AccountId | undefined>(props.target.accountId)
const memoDraft = ref(props.target.memo ?? '')

watch(
  () => [props.target.journalEntryId, props.target.accountId, props.target.memo] as const,
  ([, accountId, memo]) => {
    selected.value = accountId
    memoDraft.value = memo ?? ''
  }
)

const accountOptions = JOURNAL_ASSIGNABLE_ACCOUNTS.map((account) => ({
  label: account.family.name,
  value: account.id
})).sort((a, b) => a.label.localeCompare(b.label))

const triggerLabel = computed(
  () =>
    (props.target.accountId && accountFamilyById(props.target.accountId)?.name) ??
    'Inferred account'
)

const upsert = useUpsertJournalAccountAssignmentMutation()
const remove = useDeleteJournalAccountAssignmentMutation()
const saving = computed(() => upsert.isPending.value)
const removing = computed(() => remove.isPending.value)

function save(): void {
  if (!selected.value || saving.value || removing.value) return
  upsert.mutate(
    {
      body: {
        teamId: props.teamId,
        journalEntryId: props.target.journalEntryId,
        accountId: selected.value,
        memo: memoDraft.value.trim() || undefined
      }
    },
    {
      onSuccess: () => {
        open.value = false
        toast.add({ title: 'Journal account assigned', color: 'success' })
      },
      onError: () => toast.add({ title: 'Could not save the account assignment', color: 'error' })
    }
  )
}

function clear(): void {
  if (saving.value || removing.value) return
  remove.mutate(
    {
      queryParams: {
        teamId: props.teamId,
        journalEntryId: props.target.journalEntryId
      }
    },
    {
      onSuccess: () => {
        open.value = false
        toast.add({ title: 'Reverted to the inferred account', color: 'success' })
      },
      onError: () => toast.add({ title: 'Could not revert the account assignment', color: 'error' })
    }
  )
}
</script>
