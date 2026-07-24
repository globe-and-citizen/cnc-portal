<template>
  <div class="flex flex-col gap-4.5">
    <div>
      <label id="cc-access-label" class="mb-1.5 block text-sm font-medium">Who can lend?</label>
      <div class="flex flex-col gap-2.5" role="radiogroup" aria-labelledby="cc-access-label">
        <div :class="creditAccessRowClass(form.access === 'everyone')">
          <div
            role="radio"
            tabindex="0"
            :aria-checked="form.access === 'everyone'"
            class="flex flex-1 cursor-pointer items-center gap-3"
            data-test="access-everyone-button"
            @click="form.access = 'everyone'"
            @keydown.enter.space.prevent="form.access = 'everyone'"
          >
            <span :class="creditRadioClass(form.access === 'everyone')">
              <span v-if="form.access === 'everyone'" class="bg-primary h-2 w-2 rounded-full" />
            </span>
            <div>
              <div class="text-sm font-semibold">Everyone</div>
              <div class="text-muted mt-0.5 text-xs">
                Any member can lend, any amount they choose.
              </div>
            </div>
          </div>
        </div>
        <div :class="creditAccessRowClass(form.access === 'restricted')">
          <div
            role="radio"
            tabindex="0"
            :aria-checked="form.access === 'restricted'"
            class="flex flex-1 cursor-pointer items-center gap-3"
            data-test="access-restricted-button"
            @click="form.access = 'restricted'"
            @keydown.enter.space.prevent="form.access = 'restricted'"
          >
            <span :class="creditRadioClass(form.access === 'restricted')">
              <span v-if="form.access === 'restricted'" class="bg-primary h-2 w-2 rounded-full" />
            </span>
            <div>
              <div class="text-sm font-semibold">Restricted to a list</div>
              <div class="text-muted mt-0.5 text-xs">Only the members you pick below can lend.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="form.access === 'restricted'" class="border-default/60 border-t pt-4">
      <CreditWhitelistEditor
        :whitelist="form.whitelist"
        :default-amount-label="defaultAmountLabel"
        :principal-target="Number(form.target) || 0"
        :token="form.token"
        :cap-on="form.capOn"
        @remove="removeWhitelist"
        @update-amount="updateWhitelistAmount"
        @update-custom="updateWhitelistCustom"
        @add="addWhitelist"
      />
      <p
        v-if="accessErrors.whitelist"
        class="text-error mt-1 text-xs"
        data-test="cc-whitelist-error"
      >
        {{ accessErrors.whitelist }}
      </p>
    </div>

    <div class="border-default/60 border-t pt-4">
      <UCard variant="subtle" :ui="{ body: 'flex items-center justify-between gap-3 px-3 py-3' }">
        <div>
          <div class="text-sm font-semibold">Cap the amount per lender</div>
          <div class="text-muted text-xs">
            Optional — keeps any single lender from dominating the round.
          </div>
        </div>
        <USwitch v-model="form.capOn" data-test="cc-cap-toggle" />
      </UCard>
      <div v-if="form.capOn" class="mt-3.5 max-w-60">
        <label class="mb-1.5 block text-sm font-medium" for="cc-cap">Maximum per lender</label>
        <UInput
          id="cc-cap"
          :model-value="form.cap"
          type="number"
          min="0"
          placeholder="10000"
          class="w-full"
          data-test="cc-cap"
          @update:model-value="(v) => (form.cap = String(v))"
        >
          <template #trailing>
            <span class="text-muted text-xs font-bold">{{ form.token }}</span>
          </template>
        </UInput>
        <span
          v-if="accessErrors.cap"
          class="text-error mt-1 block text-[11px] leading-tight"
          data-test="cc-cap-error"
        >
          {{ accessErrors.cap }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  applyZodFieldErrors,
  creditAccessRowClass,
  creditRadioClass,
  findCreditToken,
  formatAmount
} from '@/utils'
import { createCreditCallAccessSchema, type CreditCallForm } from '@/types'
import CreditWhitelistEditor from './CreditWhitelistEditor.vue'

const form = defineModel<CreditCallForm>('form', { required: true })

const accessErrors = reactive<Record<string, string>>({})

// A stale error from a prior failed validate() would otherwise linger in accessErrors —
// invisible while its section is hidden (access !== 'restricted', capOn off) but ready to
// reappear the instant the user toggles back, even though nothing has been re-validated
// since. Clearing on toggle keeps a re-entered section blank until the next real check.
watch(
  () => form.value.access,
  () => delete accessErrors.whitelist
)
watch(
  () => form.value.capOn,
  () => delete accessErrors.cap
)

// null whenever there's no genuine positive cap to use as a default yet — not just when
// capOn is off, but also while it's on with an empty/zero value (nothing typed yet).
const capAmount = computed(() => {
  if (!form.value.capOn) return null
  const value = Number(form.value.cap)
  return value > 0 ? value : null
})
const defaultAmountLabel = computed(() =>
  capAmount.value != null ? formatAmount(capAmount.value, form.value.token) : 'No cap'
)

// Every lender defaults to tracking the round-level cap live — not just backfilled once.
// Any entry not marked custom stays synced to the current cap value, so bumping the cap
// after some lenders already have an amount still reaches them. A custom entry (the user
// typed into it directly) is excluded and keeps whatever value it was given.
watch(
  capAmount,
  (amount) => {
    for (const entry of form.value.whitelist) {
      if (!entry.custom) entry.amount = amount
    }
  },
  { immediate: true }
)

// Without a round-level cap there's no per-lender ceiling to speak of — every lender is
// uncapped by definition. Clear amounts and custom flags so the (now hidden) per-lender
// input can't leave stale data behind that would otherwise still count toward validation.
watch(
  () => form.value.capOn,
  (on) => {
    if (on) return
    for (const entry of form.value.whitelist) {
      entry.amount = null
      entry.custom = false
    }
  }
)

function addWhitelist(username: string, address: string) {
  form.value.whitelist.push({ username, address, amount: capAmount.value, custom: false })
}
function removeWhitelist(i: number) {
  form.value.whitelist.splice(i, 1)
}
function updateWhitelistAmount(i: number, val: string | number) {
  const entry = form.value.whitelist[i]
  if (entry) entry.amount = val === '' ? null : Number(val)
}
function updateWhitelistCustom(i: number, custom: boolean) {
  const entry = form.value.whitelist[i]
  if (!entry) return
  entry.custom = custom
  // Leaving custom mode re-syncs immediately, rather than waiting for the next cap change.
  if (!custom) entry.amount = capAmount.value
}

function validate(): boolean {
  const schema = createCreditCallAccessSchema({
    target: Number(form.value.target) || 0,
    decimals: findCreditToken(form.value.token)?.decimals
  })
  const result = schema.safeParse({
    access: form.value.access,
    whitelist: form.value.whitelist,
    capOn: form.value.capOn,
    cap: form.value.cap
  })
  return applyZodFieldErrors(result, accessErrors)
}

defineExpose({ validate })
</script>
