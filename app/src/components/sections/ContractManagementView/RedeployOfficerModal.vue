<template>
  <UModal
    v-model:open="isOpen"
    title="Redeploy Officer Contract"
    description="Deploy a new Officer contract for this team. The previous Officer is archived, not deleted."
  >
    <template #body>
      <UAlert
        color="warning"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="Read this before continuing"
        class="my-6"
      />

      <div class="mb-6 space-y-4 text-sm">
        <UAlert color="warning" variant="soft" title="What happens">
          <template #description>
            <ul class="list-inside list-disc space-y-1">
              <li v-for="(item, i) in whatHappensItems" :key="i" v-html="item" />
            </ul>
          </template>
        </UAlert>

        <UAlert color="error" variant="soft" title="What you will lose access to">
          <template #description>
            <ul class="list-inside list-disc space-y-1">
              <li v-for="(item, i) in whatYouLoseItems" :key="i" v-html="item" />
            </ul>
          </template>
        </UAlert>
      </div>

      <UAlert
        v-if="shareholderCount > 0"
        color="info"
        variant="soft"
        icon="i-heroicons-information-circle"
        :title="`${shareholderCount} shareholder${shareholderCount === 1 ? '' : 's'} will be migrated automatically`"
        class="mb-6"
      >
        <template #description>
          After the new Officer is deployed, the current share token holders will be reissued
          the same balances on the new Investor contract via
          <code>distributeMint</code>. This is a separate transaction you'll need to sign right
          after the deploy.
        </template>
      </UAlert>

      <UForm :state="form" class="mb-6 flex flex-col gap-4">
        <UFormField
          label="New share token name"
          name="name"
          required
          help="Full name of the new share token (e.g. Company SHER)"
        >
          <UInput
            v-model="form.name"
            placeholder="Company SHER"
            class="w-full"
            data-test="redeploy-share-name-input"
          />
        </UFormField>
        <UFormField
          label="New symbol"
          name="symbol"
          required
          help="Short ticker symbol (e.g. SHR, COMP)"
        >
          <UInput
            v-model="form.symbol"
            placeholder="SHR"
            class="w-full"
            data-test="redeploy-share-symbol-input"
          />
        </UFormField>
      </UForm>

      <div
        v-if="migrationFailed"
        class="border-error bg-error/5 mb-4 rounded-lg border p-4 text-sm"
        data-test="migration-error-block"
      >
        <p class="text-error font-semibold">Shareholder migration failed</p>
        <p class="mt-1">
          The new Officer is deployed and registered, but the shareholder mint did not
          complete. You can retry below, or skip and finish the migration later from the Share
          Token page.
        </p>
        <p v-if="migrationError" class="mt-2 font-mono text-xs opacity-70">
          {{ migrationError.message }}
        </p>
        <p v-if="isInconsistent" class="text-error mt-2">
          Retry is blocked: the new InvestorV1 already has a totalSupply that does not match
          the previous shareholders. Migrating again would double-mint.
        </p>
      </div>

      <div class="flex justify-between gap-3">
        <UButton
          color="secondary"
          :disabled="isRunning"
          @click="onCancelOrSkip"
          data-test="cancel-redeploy-contracts"
        >
          {{ migrationFailed ? 'Skip & close' : 'Cancel' }}
        </UButton>
        <UButton
          v-if="migrationFailed"
          color="primary"
          :loading="isRunning"
          :disabled="isRunning || isInconsistent"
          @click="retryMigration()"
          data-test="retry-migration"
        >
          Retry shareholder migration
        </UButton>
        <UButton
          v-else
          color="primary"
          :loading="isRunning"
          :disabled="!canRedeploy || isRunning"
          @click="onRedeploy"
          data-test="confirm-redeploy-contracts"
        >
          Redeploy Officer
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Address } from 'viem'
import {
  useInvestorName,
  useInvestorShareholders,
  useInvestorSymbol
} from '@/composables/investor/reads'
import { useOfficerRedeploy } from '@/composables/contracts/useOfficerRedeploy'

const isOpen = defineModel<boolean>('open', { default: false })

interface Shareholder {
  shareholder: Address
  amount: bigint
}

const whatHappensItems = [
  'A brand-new Officer contract is deployed on-chain, along with fresh sub-contracts (Bank, Voting, Board of Directors, Expense Account, Cash Remuneration, Investor / Share token).',
  "The previous Officer and its sub-contracts are <strong>archived</strong>: their database rows stay in place, linked to the old Officer, and remain visible in the team's contract history.",
  'Your <strong>Safe contract is preserved</strong> — it is not affected by this operation.'
]

const whatYouLoseItems = [
  "Funds held in the <strong>old</strong> Bank, Expense Account and Cash Remuneration contracts are still on-chain but are no longer reachable through the new Officer's UI. Withdraw or migrate them first if you need them.",
  'Existing share tokens issued by the old Investor contract remain valid on-chain but the new Investor contract starts from zero. Token holders must be redistributed manually.',
  'Voting and Board of Directors history attached to the old Officer remains visible in the archive but is not carried over.'
]

const form = ref({ name: '', symbol: '' })

const { data: currentInvestorName } = useInvestorName()
const { data: currentInvestorSymbol } = useInvestorSymbol()
const { data: currentShareholders } = useInvestorShareholders()

const {
  redeploy,
  retryMigration,
  skipMigration,
  reset,
  isRunning,
  migrationFailed,
  migrationError,
  isInconsistent
} = useOfficerRedeploy()

const canRedeploy = computed(
  () => !!form.value.name.trim() && !!form.value.symbol.trim()
)

const shareholderCount = computed(() => {
  const list = currentShareholders.value as readonly Shareholder[] | undefined
  return list?.length ?? 0
})

// Prefill the form with the current on-chain values whenever the modal opens
// or the underlying reads resolve. Users can still override before redeploying.
const prefillFromChain = () => {
  if (typeof currentInvestorName.value === 'string') {
    form.value.name = currentInvestorName.value
  }
  if (typeof currentInvestorSymbol.value === 'string') {
    form.value.symbol = currentInvestorSymbol.value
  }
}

watch([currentInvestorName, currentInvestorSymbol], prefillFromChain)
watch(isOpen, (open) => {
  if (open) prefillFromChain()
  else reset()
})

const onRedeploy = async () => {
  await redeploy({ ...form.value })
  // Close only if the full flow (including any shareholder migration)
  // completed cleanly. If migration is pending-retry, stay open so the user
  // sees the retry button.
  if (!migrationFailed.value) {
    isOpen.value = false
  }
}

const onCancelOrSkip = async () => {
  if (migrationFailed.value) {
    await skipMigration()
  }
  isOpen.value = false
}
</script>
