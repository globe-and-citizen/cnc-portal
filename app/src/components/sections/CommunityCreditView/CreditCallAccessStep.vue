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
          <div v-if="form.access === 'everyone'" class="flex flex-none flex-col items-end gap-1">
            <UInput
              :model-value="form.cap || undefined"
              type="number"
              min="0"
              placeholder="No cap"
              class="w-28"
              :color="accessErrors.cap ? 'error' : undefined"
              data-test="cc-cap"
              @update:model-value="updateCap"
            >
              <template #leading><span class="text-muted text-xs font-semibold">$</span></template>
            </UInput>
            <span class="text-muted text-[11px] leading-tight">Max per lender</span>
            <span v-if="accessErrors.cap" class="text-error text-[11px] leading-tight" data-test="cc-cap-error">
              {{ accessErrors.cap }}
            </span>
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
          <div v-if="form.access === 'restricted'" class="flex flex-none flex-col items-end gap-1">
            <UInput
              :model-value="form.cap || undefined"
              type="number"
              min="0"
              placeholder="No cap"
              class="w-28"
              :color="accessErrors.cap ? 'error' : undefined"
              data-test="cc-cap"
              @update:model-value="updateCap"
            >
              <template #leading><span class="text-muted text-xs font-semibold">$</span></template>
            </UInput>
            <span class="text-muted text-[11px] leading-tight">Max per lender</span>
            <span v-if="accessErrors.cap" class="text-error text-[11px] leading-tight" data-test="cc-cap-error">
              {{ accessErrors.cap }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="form.access === 'restricted'" class="border-default/60 border-t pt-4">
      <WhitelistEditor
        :whitelist="form.whitelist"
        :default-amount-label="defaultAmountLabel"
        :default-amount="capAmount"
        :principal-target="Number(form.target) || 0"
        :token="form.token"
        @remove="removeWhitelist"
        @update-amount="updateWhitelistAmount"
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
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { applyZodFieldErrors, creditAccessRowClass, creditRadioClass, formatAmount } from '@/utils'
import { createCreditCallAccessSchema, type CreditCallForm } from '@/types'
import WhitelistEditor from '@/components/sections/FixedReturnView/WhitelistEditor.vue'

const form = defineModel<CreditCallForm>('form', { required: true })

// No separate on/off switch — the cap is simply whatever's typed, mirroring the lender
// row's "amount" input: empty means unset ("No cap"), a value turns it on.
function updateCap(value: unknown) {
  const str = value == null ? '' : String(value)
  form.value.cap = str
  form.value.capOn = str !== ''
}

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

// Every whitelisted lender needs a nonzero allocation on-chain — the cap is the natural
// default for one that hasn't been set yet. Backfill only still-unset entries once there's
// a genuine positive cap; never overwrite an amount someone already typed. Debounced so
// typing "100" digit-by-digit doesn't fire on "1" first — that would backfill every unset
// entry to 1, un-nulling them before "0" and "0" land, leaving them stuck at 1 forever.
watchDebounced(
  capAmount,
  (amount) => {
    if (!amount) return
    for (const entry of form.value.whitelist) {
      if (entry.amount == null) entry.amount = amount
    }
  },
  { debounce: 300, maxWait: 1000 }
)

function addWhitelist(username: string, address: string, amount: number | null) {
  form.value.whitelist.push({ username, address, amount })
}
function removeWhitelist(i: number) {
  form.value.whitelist.splice(i, 1)
}
function updateWhitelistAmount(i: number, val: string | number) {
  const entry = form.value.whitelist[i]
  if (entry) entry.amount = val === '' ? null : Number(val)
}

const accessErrors = reactive<Record<string, string>>({})

function validate(): boolean {
  const schema = createCreditCallAccessSchema({ target: Number(form.value.target) || 0 })
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
