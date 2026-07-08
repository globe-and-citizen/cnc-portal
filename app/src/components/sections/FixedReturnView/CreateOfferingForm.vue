<template>
  <div class="grid max-w-5xl grid-cols-[1fr_380px] items-start gap-6">
    <!-- Left: form -->
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="text-base font-extrabold text-[#0f3d2e]">New Fixed-Return Offering</div>
      </template>

      <UStepper :items="stepperItems" v-model="step" disabled class="px-6 py-4" />

      <div class="flex flex-col gap-5 px-6 py-5">
        <OfferingBasicsStep v-if="step === 0" ref="basicsRef" :form="form" />
        <OfferingTermsStep v-if="step === 1" ref="termsRef" :form="form" />
        <OfferingAccessStep
          v-if="step === 2"
          ref="accessRef"
          :form="form"
          :whitelist="whitelist"
          :default-amount-label="defaultAmountLabel"
          @remove="removeWhitelist"
          @update-amount="updateWhitelistAmount"
          @add="addWhitelist"
        />

        <UAlert
          v-if="submitError"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :description="submitError"
          data-test="offering-error-alert"
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
            :loading="isPublishing"
            :disabled="isPublishing"
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
      :deadline-fmt="summary.deadlineFmt"
      :maturity-fmt="summary.maturityFmt"
      :access-label="summary.accessLabel"
      :access-dot="summary.accessDot"
      :limits-label="summary.limitsLabel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import OfferingSummaryCard from './OfferingSummaryCard.vue'
import OfferingBasicsStep from './OfferingBasicsStep.vue'
import OfferingTermsStep from './OfferingTermsStep.vue'
import OfferingAccessStep from './OfferingAccessStep.vue'
import {
  expectedReturn,
  getOfferingFormSummary,
  termLabel,
  toFixedReturnOfferParams
} from '@/utils'
import type { OfferingForm, WhitelistEntry } from '@/types'
import { SUPPORTED_TOKENS } from '@/constant'
import { useFixedReturnCreateLendingOffer } from '@/composables/fixedReturn/writes'

const emit = defineEmits<{ close: [] }>()

const stepperItems = [{ title: 'Basics' }, { title: 'Terms' }, { title: 'Access' }]
const step = ref(0)
const isLastStep = computed(() => step.value === stepperItems.length - 1)

type StepHandle = { validate?: () => Promise<unknown> } | null
const basicsRef = ref<StepHandle>(null)
const termsRef = ref<StepHandle>(null)
const accessRef = ref<StepHandle>(null)

const toast = useToast()
const createOfferResult = useFixedReturnCreateLendingOffer()
const isPublishing = computed(() => createOfferResult.isPending.value)
const submitError = ref<string | null>(null)

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

  submitError.value = null
  try {
    const params = toFixedReturnOfferParams(form, whitelist.value)
    await createOfferResult.mutateAsync({ args: [params] })
    toast.add({ title: 'Offering published successfully!', color: 'success' })
    emit('close')
  } catch (error) {
    submitError.value =
      (error as { shortMessage?: string; message?: string })?.shortMessage ??
      (error as Error)?.message ??
      'Failed to publish offering'
  }
}

const form = reactive<OfferingForm>({
  title: '',
  purpose: '',
  principal: 0,
  rate: 0,
  termValue: 12,
  termUnit: 'months',
  deadline: '',
  access: 'general',
  capOn: false,
  cap: 0,
  token: SUPPORTED_TOKENS[0]?.symbol
})

const whitelist = ref<WhitelistEntry[]>([])

const totalReturn = computed(() => expectedReturn(form.principal, form.rate))
const totalInterest = computed(() => totalReturn.value - form.principal)

const summary = computed(() => getOfferingFormSummary(form, whitelist.value.length))
const defaultAmountLabel = computed(() => summary.value.defaultAmountLabel)

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
