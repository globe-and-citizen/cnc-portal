<template>
  <!-- Linkable postings render as a button so the whole narration is one hit
       target ("open where this happened"); the rest stay plain text. -->
  <component
    :is="linkable ? 'button' : 'div'"
    :type="linkable ? 'button' : undefined"
    :title="linkable ? destination?.label : undefined"
    :aria-label="linkable ? destination?.label : undefined"
    :data-test="linkable ? 'activity-link' : 'activity-text'"
    class="group flex items-center gap-1.5 text-left text-sm"
    :class="linkable ? 'hover:bg-elevated -mx-1.5 cursor-pointer rounded-md px-1.5 py-0.5' : ''"
    @click="linkable && emit('open')"
  >
    <template v-if="activity.kind === 'actor'">
      <UserIdentity compact size="sm" hide-address :user="resolveUser(activity.actor)" />
      <span class="text-muted">{{ activity.text }}</span>
    </template>
    <template v-else-if="activity.kind === 'transfer'">
      <template v-if="activity.actor">
        <UserIdentity compact size="sm" hide-address :user="resolveUser(activity.actor)" />
        <span class="text-muted">transferred money from</span>
        <UserIdentity compact size="sm" hide-address :user="pocketUser(activity.from)" />
        <span class="text-muted">to</span>
        <UserIdentity compact size="sm" hide-address :user="pocketUser(activity.to)" />
      </template>
      <template v-else>
        <UserIdentity compact size="sm" hide-address :user="pocketUser(activity.from)" />
        <span class="text-muted">transferred money to</span>
        <UserIdentity compact size="sm" hide-address :user="pocketUser(activity.to)" />
      </template>
    </template>
    <span v-else-if="activity.text" class="text-muted">{{ activity.text }}</span>

    <UIcon
      v-if="linkable"
      name="i-heroicons-arrow-top-right-on-square"
      class="text-dimmed size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
    />
  </component>
</template>

<script setup lang="ts">
import UserIdentity from '@/components/ui/UserIdentity.vue'
import { resolveUser } from '@/utils/transactionHistoryUtil'
import type { ActivityCell } from '@/utils/accounting/describeEntry'
import type { ActivityDestination } from '@/utils/accounting/activityDestination'

defineProps<{
  /** The structured narration to render — avatar(s) + predicate. */
  activity: ActivityCell
  /** The section this posting happened in, when it has one. */
  destination?: ActivityDestination | null
  /** Whether that section is actually reachable — the parent resolves the route. */
  linkable?: boolean
}>()

const emit = defineEmits<{ open: [] }>()

/** A cash pocket account rendered as a contract avatar (document icon + short name). */
function pocketUser(account: string) {
  return { name: account.replace('Cash — ', ''), address: '', icon: 'heroicons:document-text' }
}
</script>
