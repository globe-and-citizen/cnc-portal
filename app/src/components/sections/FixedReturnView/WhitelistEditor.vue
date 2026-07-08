<template>
  <UCard variant="subtle" :ui="{ body: 'flex flex-col gap-3 p-4' }">
    <UAlert color="neutral" variant="soft">
      <template #description>
        Per-lender limit: <strong>{{ defaultAmountLabel }}</strong
        >. Set an explicit amount on each row — required before publishing.
      </template>
    </UAlert>

    <UAlert
      :color="targetStatusColor"
      variant="soft"
      :description="targetStatusDescription"
      data-test="whitelist-target-total"
    />

    <!-- Existing whitelist entries -->
    <div class="flex flex-col gap-2">
      <div
        v-for="(w, i) in whitelist"
        :key="i"
        data-test="whitelist-entry"
        class="flex items-center gap-3 rounded-xl border border-[#e6efe9] bg-white px-3 py-2"
      >
        <UserComponent :user="resolveUser(w.address)" class="min-w-0 flex-1" />
        <div class="flex flex-none flex-col items-end gap-0.5">
          <UInput
            type="number"
            :model-value="w.amount != null ? String(w.amount) : undefined"
            :placeholder="defaultAmountLabel"
            :color="isOverCap(w.amount) ? 'error' : undefined"
            class="w-28"
            data-test="whitelist-amount-input"
            @update:model-value="(v: unknown) => $emit('update-amount', i, String(v ?? ''))"
          >
            <template #leading><span class="text-muted text-xs font-semibold">$</span></template>
          </UInput>
          <span
            v-if="isOverCap(w.amount)"
            class="text-[10px] font-bold text-red-600"
            data-test="whitelist-amount-error"
          >
            Exceeds cap ({{ defaultAmountLabel }})
          </span>
          <span v-else class="flex items-center gap-1">
            <span
              :style="{ color: w.amount != null ? '#0a7a52' : '#b45309' }"
              class="text-[10px] font-bold"
            >
              {{ w.amount != null ? 'custom' : 'not set' }}
            </span>
            <UButton
              v-if="w.amount == null && defaultAmount != null"
              type="button"
              size="xs"
              color="success"
              variant="link"
              label="Use default"
              class="p-0 text-[10px]"
              data-test="whitelist-use-default-button"
              @click="$emit('update-amount', i, defaultAmount)"
            />
          </span>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          icon="heroicons:x-mark"
          size="xs"
          class="flex-none"
          data-test="whitelist-remove-button"
          @click="$emit('remove', i)"
        />
      </div>
    </div>

    <!-- Add lender -->
    <div class="relative flex flex-col gap-1 border-t border-[#eef4f1] pt-3">
      <span class="text-xs font-semibold text-[#9aaba2]">Add lender</span>
      <UFieldGroup data-test="whitelist-add-lender" class="w-full">
        <UInput
          v-model="search.name"
          placeholder="Name"
          data-test="whitelist-search-name"
          class="w-28"
        />
        <UInput
          v-model="search.address"
          placeholder="Address"
          data-test="whitelist-search-address"
          class="flex-1"
        />
      </UFieldGroup>
      <div
        v-if="showResults && filteredMembers.length > 0"
        class="top-full left-0 mt-1 w-full"
        data-test="whitelist-search-results"
      >
        <SelectMemberResults :members="filteredMembers" @select="handleAdd" />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import type { Member, WhitelistEntry } from '@/types'
import UserComponent from '@/components/UserComponent.vue'
import SelectMemberResults from '@/components/utils/SelectMemberResults.vue'
import { useTeamStore } from '@/stores/teamStore'
import {
  filter,
  getWhitelistAllocationSummary,
  isWhitelistAmountOverCap,
  resolveUser
} from '@/utils'

const props = defineProps<{
  whitelist: WhitelistEntry[]
  defaultAmountLabel: string
  defaultAmount: number | null
  principalTarget: number
  token: string | undefined
}>()

const allocationSummary = computed(() =>
  getWhitelistAllocationSummary(props.whitelist, props.principalTarget, props.token)
)
const targetStatusColor = computed<'error' | 'warning' | 'neutral'>(() => {
  if (allocationSummary.value.status === 'over') return 'error'
  if (allocationSummary.value.status === 'under') return 'warning'
  return 'neutral'
})

const targetStatusDescription = computed(() => allocationSummary.value.description)

const emit = defineEmits<{
  remove: [i: number]
  'update-amount': [i: number, val: string | number]
  add: [username: string, address: string, amount: number | null]
}>()

const teamStore = useTeamStore()
const search = ref({ name: '', address: '' })
const showResults = ref(false)

const members = computed<Member[]>(() => teamStore.currentTeamMeta.data?.members ?? [])

const filteredMembers = computed<Member[]>(
  () =>
    filter(members.value, search.value).filter(
      (m) => !props.whitelist.some((w) => w.address === m.address)
    ) as Member[]
)

watchDebounced(
  [() => search.value.name, () => search.value.address],
  ([name, address]) => {
    showResults.value = Boolean(name || address)
  },
  { debounce: 300, maxWait: 1000 }
)

function isOverCap(amount: number | null): boolean {
  return isWhitelistAmountOverCap(amount, props.defaultAmount)
}

function handleAdd(member: Member) {
  emit('add', member.name ?? member.address ?? '', member.address ?? '', props.defaultAmount)
  search.value = { name: '', address: '' }
  showResults.value = false
}
</script>
