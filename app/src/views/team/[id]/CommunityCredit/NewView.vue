<template>
  <div class="flex flex-col gap-5.5">
    <!-- Cancel -->
    <button
      type="button"
      class="text-muted hover:text-default flex cursor-pointer items-center gap-2 text-sm"
      @click="goList"
    >
      <UIcon name="heroicons:x-mark" class="size-4" />
      Cancel
    </button>

    <div>
      <h1 class="text-2xl font-bold tracking-tight">New credit call</h1>
      <p class="text-muted mt-1.5 text-sm">
        Set the amount, terms and who can lend. You can edit anything while it's still a draft.
      </p>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
      <!-- Wizard -->
      <div class="border-default bg-default overflow-hidden rounded-2xl border shadow-sm">
        <StepIndicator :steps="stepLabels" :current="step" />

        <div class="px-6 py-6">
          <!-- Step 1 — Basics -->
          <div v-if="step === 0" class="flex flex-col gap-4.5">
            <div>
              <label class="mb-1.5 block text-sm font-medium" for="cc-name">Round name</label>
              <input
                id="cc-name"
                v-model="form.name"
                :class="CREDIT_FIELD_CLASS"
                placeholder="e.g. Q3 runway bridge"
                data-test="cc-name"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium" for="cc-desc">Purpose</label>
              <textarea
                id="cc-desc"
                v-model="form.desc"
                :class="[CREDIT_FIELD_CLASS, 'min-h-20 py-2.5']"
                placeholder="What is this credit for? Members see this before lending."
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium" for="cc-target"
                  >Target amount</label
                >
                <div class="relative">
                  <input
                    id="cc-target"
                    v-model="form.target"
                    type="number"
                    min="0"
                    :class="[CREDIT_FIELD_CLASS, 'pr-14']"
                    placeholder="25000"
                  />
                  <span
                    class="text-muted absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold"
                  >
                    {{ form.token }}
                  </span>
                </div>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium">Token</label>
                <div class="flex gap-1.5">
                  <button
                    v-for="t in tokens"
                    :key="t"
                    type="button"
                    :class="creditChipClass(form.token === t)"
                    @click="form.token = t"
                  >
                    {{ t }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2 — Terms -->
          <CreditCallTermsStep v-else-if="step === 1" v-model:form="form" />

          <!-- Step 3 — Access -->
          <CreditCallAccessStep v-else v-model:form="form" />
        </div>

        <!-- Footer nav -->
        <div class="border-default flex items-center justify-between border-t px-6 py-4">
          <UButton
            variant="ghost"
            color="neutral"
            icon="heroicons:arrow-left"
            label="Back"
            :class="{ invisible: step === 0 }"
            data-test="cc-back"
            @click="back"
          />
          <UButton
            color="primary"
            :label="isLastStep ? 'Publish credit call' : 'Continue'"
            :trailing-icon="isLastStep ? 'heroicons:rocket-launch' : 'heroicons:arrow-right'"
            data-test="cc-next"
            @click="next"
          />
        </div>
      </div>

      <!-- Live summary -->
      <CreditCallSummaryCard :form="form" :whitelist-count="whitelistCount" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables'
import { useCommunityCreditStore } from '@/stores'
import { CREDIT_FIELD_CLASS, creditChipClass } from '@/utils'
import type { CreditCallForm } from '@/types'
import StepIndicator from '@/components/sections/FixedReturnView/StepIndicator.vue'
import CreditCallAccessStep from '@/components/sections/CommunityCreditView/CreditCallAccessStep.vue'
import CreditCallTermsStep from '@/components/sections/CommunityCreditView/CreditCallTermsStep.vue'
import CreditCallSummaryCard from '@/components/sections/CommunityCreditView/CreditCallSummaryCard.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useCommunityCreditStore()

const teamId = computed(() => String(route.params.id))

const stepLabels = ['Basics', 'Terms', 'Access']
const step = ref(0)
const isLastStep = computed(() => step.value === stepLabels.length - 1)

const tokens = ['USDC', 'POL', 'SHER']

const form = reactive<CreditCallForm>({
  name: '',
  desc: '',
  target: '25000',
  token: 'USDC',
  rate: '6',
  period: 90,
  periodMode: 'preset',
  periodVal: '90',
  periodUnit: 'days',
  deadline: '2026-07-31',
  access: 'everyone',
  whitelist: {},
  capOn: false,
  cap: '10000'
})

const whitelistCount = computed(() => Object.values(form.whitelist).filter(Boolean).length)

function back() {
  if (step.value > 0) step.value--
}
function next() {
  if (!isLastStep.value) {
    step.value++
    return
  }
  store.createRound(form)
  toast.add({ title: 'Credit call published — now Open', color: 'success' })
  goList()
}
function goList() {
  router.push({ name: 'community-credit', params: { id: teamId.value } })
}
</script>
