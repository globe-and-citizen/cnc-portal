<template>
  <UForm ref="formRef" :schema="schema" :state="state" class="flex flex-col gap-5">
    <section class="flex flex-col gap-2">
      <UFormField name="access" label="Who can lend" hint="Optional">
        <URadioGroup
          :model-value="form.access"
          :items="accessOptions"
          orientation="horizontal"
          variant="card"
          class="w-full"
          data-test="offering-access-picker"
          :ui="{ fieldset: 'grid w-full grid-cols-2 gap-3', item: 'cursor-pointer' }"
          @update:model-value="updateAccess"
        >
          <template #label="{ item }">
            <span class="text-sm font-bold" :data-test="`access-${String(item.value)}-button`">
              {{ item.label }}
            </span>
          </template>
        </URadioGroup>
      </UFormField>

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
      <UAlert
        color="success"
        variant="soft"
        icon="heroicons:shield-check"
        description="Backed by the signed agreement only. Project assets and revenue rights arrive post-MVP."
        data-test="offering-collateral-alert"
      >
        <template #title>
          <div class="flex items-center gap-2">
            None — unsecured
            <UBadge color="success" variant="soft" size="xs">MVP</UBadge>
          </div>
        </template>
      </UAlert>
    </section>
  </UForm>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import WhitelistEditor from './WhitelistEditor.vue'
import { createOfferingAccessSchema, type OfferingForm, type WhitelistEntry } from '@/types'

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

const accessOptions = [
  { label: 'Anyone', description: 'Open to all lenders', value: 'general' },
  {
    label: 'Specific lenders',
    description: 'Only addresses you list',
    value: 'whitelist'
  }
]

function updateAccess(value: unknown) {
  if (value === 'general' || value === 'whitelist') form.value.access = value
}

const state = computed(() => ({
  access: form.value.access,
  whitelist: props.whitelist
}))

const schema = computed(() =>
  createOfferingAccessSchema({
    cap: capAmount.value,
    principal: form.value.principal
  })
)

const formRef = ref<{ validate: () => Promise<unknown> } | null>(null)
defineExpose({ validate: () => formRef.value!.validate() })
</script>
