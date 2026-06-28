<template>
  <UForm ref="formRef" :schema="schema" :state="state" class="flex flex-col gap-5">
    <section class="flex flex-col gap-2">
      <div class="text-xs font-bold tracking-widest text-[#9aaba2] uppercase">
        Who can lend
        <span class="font-semibold tracking-normal text-[#bcc9c2] normal-case">· optional</span>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          :class="pickerClass(form.access === 'general')"
          data-test="access-general-button"
          @click="form.access = 'general'"
        >
          <span class="text-sm font-bold">Anyone</span>
          <span class="text-xs opacity-75">Open to all lenders</span>
        </button>
        <button
          type="button"
          :class="pickerClass(form.access === 'whitelist')"
          data-test="access-whitelist-button"
          @click="form.access = 'whitelist'"
        >
          <span class="text-sm font-bold">Specific lenders</span>
          <span class="text-xs opacity-75">Only addresses you list</span>
        </button>
      </div>
      <UFormField v-if="form.access === 'whitelist'" name="whitelist">
        <WhitelistEditor
          :whitelist="whitelist"
          :default-amount-label="defaultAmountLabel"
          :default-amount="capAmount"
          :principal-target="form.principal"
          :token="form.token"
          @remove="$emit('remove', $event)"
          @update-amount="(i, val) => $emit('update-amount', i, val)"
          @add="(username, address, amount) => $emit('add', username, address, amount)"
        />
      </UFormField>
    </section>

    <section class="flex flex-col gap-2">
      <div class="text-xs font-bold tracking-widest text-[#9aaba2] uppercase">
        Collateral / fallback
      </div>
      <div
        class="flex items-center gap-3 rounded-xl border border-[#d6f1e6] bg-[#f0fbf6] px-3 py-2"
      >
        <div
          class="bg-primary flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white"
        >
          <UIcon name="heroicons:shield-check" class="size-4" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 text-sm font-bold text-[#0f3d2e]">
            None — unsecured
            <UBadge color="success" variant="soft" size="xs">MVP</UBadge>
          </div>
          <div class="text-xs text-[#5b6e64]">
            Backed by the signed agreement only. Project assets &amp; revenue rights arrive
            post-MVP.
          </div>
        </div>
      </div>
    </section>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import WhitelistEditor from './WhitelistEditor.vue'
import type { OfferingForm, WhitelistEntry } from '@/types'
import { pickerClass, sumWhitelistAmount } from '@/utils'

const form = defineModel<OfferingForm>('form', { required: true })

const props = defineProps<{
  whitelist: WhitelistEntry[]
  defaultAmountLabel: string
}>()

defineEmits<{
  remove: [i: number]
  'update-amount': [i: number, val: string | number]
  add: [username: string, address: string, amount: number | null]
}>()

const capAmount = computed(() => (form.value.capOn ? form.value.cap : null))

const state = computed(() => ({
  access: form.value.access,
  whitelist: props.whitelist
}))

const schema = computed(() =>
  z
    .object({
      access: z.enum(['general', 'whitelist']),
      whitelist: z.array(
        z.object({
          username: z.string(),
          address: z.string(),
          amount: z.number().nullable()
        })
      )
    })
    .refine(
      (data) => data.access !== 'whitelist' || data.whitelist.every((w) => w.amount != null),
      {
        message: 'Set an amount for every whitelisted lender before publishing',
        path: ['whitelist']
      }
    )
    .refine(
      (data) => {
        const cap = capAmount.value
        return cap == null || data.whitelist.every((w) => w.amount == null || w.amount <= cap)
      },
      {
        message: 'One or more lenders exceed the per-lender cap',
        path: ['whitelist']
      }
    )
    .refine(
      (data) =>
        data.access !== 'whitelist' || sumWhitelistAmount(data.whitelist) <= form.value.principal,
      {
        message: 'Whitelisted allocations exceed the principal target',
        path: ['whitelist']
      }
    )
)

const formRef = ref<{ validate: () => Promise<unknown> } | null>(null)
defineExpose({ validate: () => formRef.value!.validate() })
</script>
