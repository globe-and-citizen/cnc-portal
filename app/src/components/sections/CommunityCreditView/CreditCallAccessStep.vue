<template>
  <div class="flex flex-col gap-4.5">
    <div>
      <label class="mb-1.5 block text-sm font-medium">Who can lend?</label>
      <div class="flex flex-col gap-2.5">
        <div
          :class="creditAccessRowClass(form.access === 'everyone')"
          @click="form.access = 'everyone'"
        >
          <span :class="creditRadioClass(form.access === 'everyone')">
            <span v-if="form.access === 'everyone'" class="bg-primary h-2 w-2 rounded-full" />
          </span>
          <div>
            <div class="text-sm font-semibold">Everyone in the team</div>
            <div class="text-muted mt-0.5 text-xs">
              Any member can lend, any amount they choose.
            </div>
          </div>
        </div>
        <div
          :class="creditAccessRowClass(form.access === 'restricted')"
          @click="form.access = 'restricted'"
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

    <div
      v-if="form.access === 'restricted'"
      class="border-default max-h-56 overflow-y-auto rounded-xl border p-1.5"
    >
      <label
        v-for="m in store.members"
        :key="m.id"
        class="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-colors"
      >
        <span :class="creditCheckClass(!!form.whitelist[m.id])">
          <UIcon v-if="form.whitelist[m.id]" name="heroicons:check" class="size-3" />
        </span>
        <input v-model="form.whitelist[m.id]" type="checkbox" class="sr-only" />
        <CreditAvatar :name="m.name" :gradient="m.gradient" :size="28" />
        <div class="flex-1">
          <div class="text-sm font-semibold">{{ m.name }}</div>
          <div class="text-muted font-mono text-[11px]">{{ m.addr }}</div>
        </div>
      </label>
    </div>

    <div class="border-default/60 border-t pt-4">
      <div class="flex items-center justify-between">
        <span class="flex flex-col">
          <span class="text-sm font-semibold">Cap the amount per lender</span>
          <span class="text-muted text-xs">
            Optional — keeps any single lender from dominating the round.
          </span>
        </span>
        <USwitch v-model="form.capOn" />
      </div>
      <div v-if="form.capOn" class="mt-3.5 max-w-60">
        <label class="mb-1.5 block text-sm font-medium" for="cc-cap">Maximum per lender</label>
        <div class="relative">
          <input
            id="cc-cap"
            v-model="form.cap"
            type="number"
            min="0"
            :class="[CREDIT_FIELD_CLASS, 'pr-14']"
            placeholder="10000"
          />
          <span class="text-muted absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold">
            {{ form.token }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCommunityCreditStore } from '@/stores'
import {
  CREDIT_FIELD_CLASS,
  creditAccessRowClass,
  creditCheckClass,
  creditRadioClass
} from '@/utils'
import type { CreditCallForm } from '@/types'
import CreditAvatar from './CreditAvatar.vue'

const form = defineModel<CreditCallForm>('form', { required: true })

const store = useCommunityCreditStore()
</script>
