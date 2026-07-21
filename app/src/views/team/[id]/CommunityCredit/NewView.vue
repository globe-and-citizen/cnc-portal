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
        Set the amount, terms and who can lend, then publish it on-chain from the Credit Account.
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
              <UInput
                id="cc-name"
                v-model="form.name"
                :color="basicsErrors.name ? 'error' : undefined"
                placeholder="e.g. Q3 runway bridge"
                class="w-full"
                data-test="cc-name"
              />
              <p v-if="basicsErrors.name" class="text-error mt-1 text-xs" data-test="cc-name-error">
                {{ basicsErrors.name }}
              </p>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium" for="cc-desc">Purpose</label>
              <UTextarea
                id="cc-desc"
                v-model="form.desc"
                placeholder="What is this credit for? Members see this before lending."
                class="w-full"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium" for="cc-target"
                  >Target amount</label
                >
                <UInput
                  id="cc-target"
                  v-model="form.target"
                  type="number"
                  min="0"
                  :color="basicsErrors.target ? 'error' : undefined"
                  placeholder="25000"
                  class="w-full"
                  data-test="cc-target"
                >
                  <template #trailing>
                    <span class="text-muted text-xs font-bold">{{ form.token }}</span>
                  </template>
                </UInput>
                <p
                  v-if="basicsErrors.target"
                  class="text-error mt-1 text-xs"
                  data-test="cc-target-error"
                >
                  {{ basicsErrors.target }}
                </p>
              </div>
              <div>
                <label id="cc-token-label" class="mb-1.5 block text-sm font-medium">Token</label>
                <div class="flex gap-1.5" role="radiogroup" aria-labelledby="cc-token-label">
                  <button
                    v-for="t in tokens"
                    :key="t"
                    type="button"
                    role="radio"
                    :aria-checked="form.token === t"
                    :class="creditChipClass(form.token === t)"
                    :data-test="`cc-token-${t}`"
                    @click="form.token = t"
                  >
                    {{ t }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2 — Terms -->
          <CreditCallTermsStep v-else-if="step === 1" ref="termsStepRef" v-model:form="form" />

          <!-- Step 3 — Access -->
          <CreditCallAccessStep v-else ref="accessStepRef" v-model:form="form" />
        </div>

        <!-- Error -->
        <div v-if="submitError" class="px-6 pb-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :description="submitError"
            data-test="cc-error"
          />
        </div>

        <!-- Footer nav -->
        <div class="border-default flex items-center justify-between border-t px-6 py-4">
          <UButton
            variant="ghost"
            color="neutral"
            icon="heroicons:arrow-left"
            label="Back"
            :class="{ invisible: step === 0 }"
            :disabled="isPublishing"
            data-test="cc-back"
            @click="back"
          />
          <UButton
            color="primary"
            :label="publishLabel"
            :trailing-icon="isLastStep ? 'heroicons:rocket-launch' : 'heroicons:arrow-right'"
            :loading="isPublishing"
            :disabled="isPublishing"
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
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { readContract } from '@wagmi/core'
import type { Address } from 'viem'
import { useToast } from '@nuxt/ui/composables'
import { useQueryClient } from '@tanstack/vue-query'
import { config } from '@/wagmi.config'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'
import {
  useFixedReturnAddress,
  useFixedReturnGetSupportedTokens
} from '@/composables/fixedReturn/reads'
import { useFixedReturnCreateLendingOffer } from '@/composables/fixedReturn/writes'
import { useCreateFixedReturnOfferingMutation } from '@/queries/fixedReturnOffering.queries'
import {
  applyZodFieldErrors,
  classifyError,
  creditChipClass,
  getSupportedCreditTokenOptions,
  toCreditCallOfferParams
} from '@/utils'
import { creditCallBasicsSchema, type CreditCallForm, type CreditOfferForm } from '@/types'
import StepIndicator from '@/components/ui/StepIndicator.vue'
import CreditCallAccessStep from '@/components/sections/CommunityCreditView/CreditCallAccessStep.vue'
import CreditCallTermsStep from '@/components/sections/CommunityCreditView/CreditCallTermsStep.vue'
import CreditCallSummaryCard from '@/components/sections/CommunityCreditView/CreditCallSummaryCard.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const queryClient = useQueryClient()
const fixedReturnAddress = useFixedReturnAddress()

const teamId = computed(() => String(route.params.id))

const stepLabels = ['Basics', 'Terms', 'Access']
const step = ref(0)
const isLastStep = computed(() => step.value === stepLabels.length - 1)

type StepHandle = { validate?: () => boolean } | null
const termsStepRef = ref<StepHandle>(null)
const accessStepRef = ref<StepHandle>(null)

// Only tokens this team's FixedReturn contract actually accepts (ERC20-only).
const { data: supportedTokens } = useFixedReturnGetSupportedTokens()
const tokens = computed(() =>
  getSupportedCreditTokenOptions((supportedTokens.value as Address[] | undefined) ?? []).map(
    (option) => option.value
  )
)

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
  whitelist: [],
  capOn: false,
  cap: ''
})

// Keep the selected token valid against what the contract supports.
watch(
  tokens,
  (list) => {
    const [first] = list
    if (first && !list.includes(form.token)) form.token = first
  },
  { immediate: true }
)

const whitelistCount = computed(() => form.whitelist.length)

const createOfferResult = useFixedReturnCreateLendingOffer()
const createMetadataResult = useCreateFixedReturnOfferingMutation()
const isPublishing = computed(
  () => createOfferResult.isPending.value || createMetadataResult.isPending.value
)
const submitError = ref<string | null>(null)
const publishLabel = computed(() =>
  isLastStep.value ? (isPublishing.value ? 'Publishing…' : 'Publish credit call') : 'Continue'
)

const basicsErrors = reactive<Record<string, string>>({})

/** Validates the Basics step; populates basicsErrors and returns whether it passed. */
function validateBasics(): boolean {
  const result = creditCallBasicsSchema.safeParse({ name: form.name, target: form.target })
  return applyZodFieldErrors(result, basicsErrors)
}

function back() {
  if (step.value > 0) step.value--
}
function next() {
  if (step.value === 0 && !validateBasics()) return
  if (step.value === 1 && termsStepRef.value?.validate?.() === false) return
  if (step.value === 2 && accessStepRef.value?.validate?.() === false) return

  if (!isLastStep.value) {
    step.value++
    return
  }
  publish()
}

async function publish() {
  submitError.value = null
  if (!fixedReturnAddress.value) {
    submitError.value = 'No Credit Account is deployed for this team.'
    return
  }

  try {
    // A Community Credit round has a single date: lending closes and the loan starts on
    // the subscription deadline, so startDate == deadline. FixedReturn.sol requires
    // subscriptionDeadline <= startDate (reverts InvalidDeadline otherwise). The term is
    // already in canonical days, so it maps straight to the contract's Days unit.
    const offeringForm: CreditOfferForm = {
      title: form.name.trim(),
      purpose: form.desc.trim(),
      principal: Number(form.target) || 0,
      rate: Number(form.rate) || 0,
      termValue: form.period,
      termUnit: 'days',
      deadline: form.deadline,
      access: form.access === 'restricted' ? 'whitelist' : 'general',
      capOn: form.capOn,
      cap: Number(form.cap) || 0,
      token: form.token
    }

    const params = toCreditCallOfferParams(offeringForm, form.whitelist)
    await createOfferResult.mutateAsync({ args: [params] })

    // Offers are 1-indexed and sequential, so the new offer's id is the post-write count.
    const total = (await readContract(config, {
      address: fixedReturnAddress.value,
      abi: FIXED_RETURN_ABI,
      functionName: 'totalOfferings'
    })) as bigint
    const offerId = Number(total)

    if (offeringForm.title) {
      await createMetadataResult.mutateAsync({
        body: {
          teamId: Number(teamId.value),
          offerId,
          title: offeringForm.title,
          purpose: offeringForm.purpose || undefined
        }
      })
    }

    await queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] })
    toast.add({ title: 'Credit call published — now Open', color: 'success' })
    goList()
  } catch (error) {
    submitError.value = classifyError(error, { contract: 'FixedReturn' }).userMessage
  }
}

function goList() {
  router.push({ name: 'community-credit', params: { id: teamId.value } })
}
</script>
