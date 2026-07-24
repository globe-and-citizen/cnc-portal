<template>
  <UCard variant="subtle" :ui="{ body: 'flex flex-col gap-3 p-4' }">
    <p
      v-if="capOn"
      :class="targetStatusClass"
      class="text-xs font-semibold"
      data-test="whitelist-target-total"
    >
      {{ targetStatusDescription }}
    </p>

    <!-- Existing whitelist entries -->
    <div class="flex flex-col gap-2">
      <div
        v-for="(w, i) in whitelist"
        :key="i"
        data-test="whitelist-entry"
        class="flex items-center gap-3 rounded-xl border border-[#e6efe9] bg-white px-3 py-2"
      >
        <CreditAvatar
          :name="resolveUser(w.address).name ?? w.address"
          :gradient="gradientForAddress(w.address)"
          :size="28"
        />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold">
            {{ resolveUser(w.address).name || 'User' }}
          </div>
          <div class="text-muted truncate font-mono text-[11px]">
            {{ formatAddress(w.address) }}
          </div>
        </div>
        <div class="flex flex-none flex-col items-end gap-0.5">
          <template v-if="!capOn">
            <span class="text-primary text-[10px] font-bold" data-test="whitelist-uncapped-label">
              Uncapped
            </span>
          </template>
          <template v-else>
            <UInput
              type="number"
              min="0"
              :model-value="w.amount != null ? String(w.amount) : ''"
              :placeholder="defaultAmountLabel"
              :readonly="!w.custom"
              :variant="w.custom ? 'outline' : 'subtle'"
              size="sm"
              class="w-28"
              :class="!w.custom && 'text-muted cursor-pointer'"
              data-test="whitelist-amount-input"
              @focus="!w.custom && $emit('update-custom', i, true)"
              @update:model-value="(v) => $emit('update-amount', i, v)"
            >
              <template #leading><span class="text-muted text-xs font-semibold">$</span></template>
            </UInput>
            <span class="flex items-center gap-1">
              <span
                :style="{ color: w.custom ? '#0a7a52' : '#6b7c74' }"
                class="text-[10px] font-bold"
              >
                {{ w.custom ? 'custom' : 'default' }}
              </span>
              <UButton
                v-if="w.custom"
                type="button"
                size="xs"
                color="success"
                variant="link"
                label="Reset to default"
                class="p-0 text-[10px]"
                data-test="whitelist-reset-default-button"
                @click="$emit('update-custom', i, false)"
              />
            </span>
          </template>
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
        <SelectMemberResults :members="filteredMembers" variant="list" @select="handleAdd" />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import type { CreditWhitelistEntry, Member } from '@/types'
import CreditAvatar from './CreditAvatar.vue'
import SelectMemberResults from '@/components/utils/SelectMemberResults.vue'
import { formatAddress } from '@/utils/formatAddress'
import { useTeamStore } from '@/stores/teamStore'
import {
  filter,
  getCreditWhitelistAllocationSummary,
  gradientForAddress,
  resolveUser
} from '@/utils'

const props = defineProps<{
  whitelist: CreditWhitelistEntry[]
  defaultAmountLabel: string
  principalTarget: number
  token: string | undefined
  /** Without a round-level cap there's no per-lender ceiling — every lender is
   *  uncapped by definition, so the per-lender amount input/toggle stay hidden. */
  capOn: boolean
}>()

const allocationSummary = computed(() =>
  getCreditWhitelistAllocationSummary(props.whitelist, props.principalTarget, props.token)
)
const targetStatusClass = computed(() => {
  // 'over' is a deliberate, publishable buffer against a lender who doesn't deposit —
  // only 'under' actually blocks publishing (AllocationSumBelowFundingTarget).
  if (allocationSummary.value.status === 'under') return 'text-error'
  if (allocationSummary.value.status === 'over') return 'text-muted'
  return 'text-muted'
})

const targetStatusDescription = computed(() => allocationSummary.value.description)

const emit = defineEmits<{
  remove: [i: number]
  'update-amount': [i: number, val: string | number]
  'update-custom': [i: number, custom: boolean]
  add: [username: string, address: string]
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

function handleAdd(member: Member) {
  emit('add', member.name ?? member.address ?? '', member.address ?? '')
  search.value = { name: '', address: '' }
  showResults.value = false
}
</script>
