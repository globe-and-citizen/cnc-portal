<template>
  <div class="grid max-w-5xl grid-cols-[1fr_380px] items-start gap-6">
    <!-- Left: form -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="text-base font-extrabold text-[#0f3d2e]">New Fixed-Return Offering</div>
      </template>

      <StepIndicator :steps="stepLabels" :current="step" />

      <div class="flex flex-col gap-5 px-6 py-5">
        <OfferingBasicsStep v-if="step === 0" ref="basicsRef" v-model:form="form" />
        <OfferingTermsStep v-if="step === 1" ref="termsRef" v-model:form="form" />
        <OfferingAccessStep
          v-if="step === 2"
          ref="accessRef"
          v-model:form="form"
          :whitelist="whitelist"
          :default-amount-label="defaultAmountLabel"
          @remove="removeWhitelist"
          @update-amount="updateWhitelistAmount"
          @add="addWhitelist"
        />
      </div>

      <template #footer>
        <div class="flex justify-between">
          <UButton
            size="sm"
            variant="ghost"
            icon="heroicons:arrow-left"
            label="Back"
            :class="{ invisible: step === 0 }"
            data-test="offering-back-button"
            @click="back"
          />
          <UButton
            size="sm"
            color="primary"
            :label="isLastStep ? 'Publish offering' : 'Continue'"
            :trailing-icon="isLastStep ? 'heroicons:rocket-launch' : 'heroicons:arrow-right'"
            data-test="offering-next-button"
            @click="next"
          />
        </div>
      </template>
    </UCard>

    <!-- Right: live summary -->
    <OfferingSummaryCard
      :title="form.title"
      :principal="form.principal"
      :rate="form.rate"
      :term-label="termLabel(form.termValue, form.termUnit)"
      :total-interest="totalInterest"
      :total-return="totalReturn"
      :start-fmt="startFmt"
      :maturity-fmt="maturityFmt"
      :access-label="accessLabel"
      :access-dot="accessDot"
      :limits-label="limitsLabel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import OfferingSummaryCard from './OfferingSummaryCard.vue'
import StepIndicator from './StepIndicator.vue'
import OfferingBasicsStep from './OfferingBasicsStep.vue'
import OfferingTermsStep from './OfferingTermsStep.vue'
import OfferingAccessStep from './OfferingAccessStep.vue'
import { expectedReturn, formatOfferingDate, maturityLabel, termLabel } from '@/utils'
import type { OfferingForm, WhitelistEntry } from '@/types'
import { SUPPORTED_TOKENS } from '@/constant'

const emit = defineEmits<{ close: [] }>()

const stepLabels = ['Basics', 'Terms', 'Access']
const step = ref(0)
const isLastStep = computed(() => step.value === stepLabels.length - 1)

type StepHandle = { validate?: () => Promise<unknown> } | null
const basicsRef = ref<StepHandle>(null)
const termsRef = ref<StepHandle>(null)
const accessRef = ref<StepHandle>(null)

const toast = useToast()

function back() {
  if (step.value > 0) step.value--
}
async function next() {
  const activeRef = [basicsRef, termsRef, accessRef][step.value]
  try {
    await activeRef?.value?.validate?.()
  } catch {
    return
  }
  if (!isLastStep.value) {
    step.value++
    return
  }
  toast.add({ title: 'Offering published successfully!', color: 'success' })
  emit('close')
}

const form = reactive<OfferingForm>({
  title: 'Riverside Expansion Note',
  purpose: '',
  principal: 500000,
  rate: 9,
  termValue: 12,
  termUnit: 'months',
  startDate: '2026-07-01',
  deadline: '2026-06-30',
  access: 'general',
  capOn: false,
  cap: 50000,
  token: SUPPORTED_TOKENS[0]?.symbol
})

const whitelist = ref<WhitelistEntry[]>([
  { username: '@liangw', address: '0x4D21…A8e1', amount: 30000 },
  { username: '@priyan', address: '0xB1f7…3D92', amount: null }
])

const totalReturn = computed(() => expectedReturn(form.principal, form.rate))
const totalInterest = computed(() => totalReturn.value - form.principal)

const defaultAmountLabel = computed(() =>
  form.capOn ? `${Math.round(form.cap).toLocaleString('en-US')} ${form.token}` : 'No cap'
)

const limitsLabel = computed(() =>
  form.capOn ? `Capped at ${Math.round(form.cap).toLocaleString('en-US')} ${form.token}` : 'No cap'
)

const accessLabel = computed(() =>
  form.access === 'whitelist' ? `Whitelist · ${whitelist.value.length} lenders` : 'General · anyone'
)
const accessDot = computed(() => (form.access === 'whitelist' ? '#3366ff' : '#00bf7a'))

const startFmt = computed(() => formatOfferingDate(form.startDate))
const maturityFmt = computed(() => maturityLabel(form.startDate, form.termValue, form.termUnit))

function addWhitelist(username: string, address: string, amount: number | null) {
  whitelist.value.push({ username, address, amount })
}
function removeWhitelist(i: number) {
  whitelist.value.splice(i, 1)
}
function updateWhitelistAmount(i: number, val: string | number) {
  const entry = whitelist.value[i]
  if (entry) entry.amount = val === '' ? null : Number(val)
}
</script>
