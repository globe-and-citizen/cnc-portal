<template>
  <div class="border border-[#e6efe9] rounded-xl p-4 bg-[#fafdfb] flex flex-col gap-3">
    <div class="text-xs text-[#5b6e64] leading-relaxed bg-[#eef4f1] rounded-lg px-3 py-2">
      Per-lender limit: <strong class="text-[#0f3d2e]">{{ defaultAmountLabel }}</strong>.
      Set an explicit amount on each row — required before publishing.
    </div>

    <div
      class="text-xs font-bold rounded-lg px-3 py-2"
      :class="targetStatusClass"
      data-test="whitelist-target-total"
    >
      Lenders allocated: {{ committedTotal.toLocaleString('en-US') }} / {{ Math.round(principalTarget).toLocaleString('en-US') }} {{ token }}
      <span v-if="overTarget">— exceeds target by {{ (committedTotal - principalTarget).toLocaleString('en-US') }} {{ token }}</span>
      <span v-else-if="underTarget">— {{ (principalTarget - committedTotal).toLocaleString('en-US') }} {{ token }} short of target; this offering can't reach its target through whitelisted lenders alone</span>
    </div>

    <!-- Existing whitelist entries -->
    <div class="flex flex-col gap-2">
      <div
        v-for="(w, i) in whitelist"
        :key="i"
        data-test="whitelist-entry"
        class="flex items-center gap-3 bg-white border border-[#e6efe9] rounded-xl px-3 py-2"
      >
        <UserComponent
          :user="resolveUser(w.address)"
          class="flex-1 min-w-0"
        />
        <div class="flex flex-col items-end gap-0.5 flex-none">
          <UInput
            type="number"
            :model-value="w.amount != null ? String(w.amount) : undefined"
            :placeholder="defaultAmountLabel"
            :color="isOverCap(w.amount) ? 'error' : undefined"
            class="w-28"
            data-test="whitelist-amount-input"
            @update:model-value="v => $emit('update-amount', i, v)"
          >
            <template #leading><span class="text-xs font-semibold text-muted">$</span></template>
          </UInput>
          <span
            v-if="isOverCap(w.amount)"
            class="text-[10px] font-bold text-red-600"
            data-test="whitelist-amount-error"
          >
            Exceeds cap ({{ defaultAmountLabel }})
          </span>
          <span v-else class="flex items-center gap-1">
            <span :style="{ color: w.amount != null ? '#0a7a52' : '#b45309' }" class="text-[10px] font-bold">
              {{ w.amount != null ? 'custom' : 'not set' }}
            </span>
            <button
              v-if="w.amount == null && defaultAmount != null"
              type="button"
              class="text-[10px] font-bold underline text-[#0a7a52] cursor-pointer"
              data-test="whitelist-use-default-button"
              @click="$emit('update-amount', i, defaultAmount)"
            >
              Use default
            </button>
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
    <div class="border-t border-[#eef4f1] pt-3 flex flex-col gap-1 relative">
      <span class="text-xs font-semibold text-[#9aaba2]">Add lender</span>
      <UFieldGroup data-test="whitelist-add-lender" class="w-full">
        <UInput v-model="search.name" placeholder="Name" data-test="whitelist-search-name" class="w-28" />
        <UInput v-model="search.address" placeholder="Address" data-test="whitelist-search-address" class="flex-1" />
      </UFieldGroup>
      <div v-if="showResults && filteredMembers.length > 0" class="top-full left-0 mt-1 w-full" data-test="whitelist-search-results">
        <SelectMemberResults :members="filteredMembers" @select="handleAdd" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import type { Member } from '@/types'
import UserComponent from '@/components/UserComponent.vue'
import SelectMemberResults from '@/components/utils/SelectMemberResults.vue'
import { useTeamStore } from '@/stores/teamStore'
import { resolveUser, filter } from '@/utils'
import { sumWhitelistAmount } from './offeringForm'

const props = defineProps<{
  whitelist: { username: string; address: string; amount: number | null }[]
  defaultAmountLabel: string
  defaultAmount: number | null
  principalTarget: number
  token: string | undefined
}>()

const committedTotal = computed(() => sumWhitelistAmount(props.whitelist))
const overTarget = computed(() => committedTotal.value > props.principalTarget)
const underTarget = computed(
  () => props.whitelist.length > 0 && committedTotal.value < props.principalTarget
)
const targetStatusClass = computed(() => {
  if (overTarget.value) return 'bg-red-50 text-red-600'
  if (underTarget.value) return 'bg-amber-50 text-amber-700'
  return 'bg-[#eef4f1] text-[#5b6e64]'
})

const emit = defineEmits<{
  remove: [i: number]
  'update-amount': [i: number, val: string | number]
  add: [username: string, address: string, amount: number | null]
}>()

const teamStore = useTeamStore()
const search = ref({ name: '', address: '' })
const showResults = ref(false)

const members = computed<Member[]>(() => teamStore.currentTeamMeta.data?.members ?? [])

const filteredMembers = computed<Member[]>(() =>
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
  return props.defaultAmount != null && amount != null && amount > props.defaultAmount
}

function handleAdd(member: Member) {
  emit('add', member.name ?? member.address ?? '', member.address ?? '', props.defaultAmount)
  search.value = { name: '', address: '' }
  showResults.value = false
}
</script>
