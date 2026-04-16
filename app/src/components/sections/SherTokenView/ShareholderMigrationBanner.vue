<template>
  <UCard v-if="showBanner" class="border-warning border" data-test="shareholder-migration-banner">
    <div class="flex items-start gap-3">
      <UIcon name="i-heroicons-arrow-path" class="text-warning mt-1 h-5 w-5 shrink-0" />
      <div class="flex-1">
        <p class="font-semibold">Shareholder migration pending</p>
        <p class="mt-1 text-sm">
          A new Officer was deployed for this team but the previous share token holders have
          not been reissued on the new InvestorV1 contract yet. Click below to read the
          previous shareholders on-chain and mint them here.
        </p>

        <p
          v-if="isInconsistent"
          class="text-error mt-2 text-sm"
          data-test="migration-banner-blocked"
        >
          The new InvestorV1 already has a totalSupply that does not match the previous
          shareholders. Migration is blocked to prevent double-minting. Inspect the contract
          state before retrying.
        </p>

        <p
          v-else-if="migrate.isError.value && migrate.error.value"
          class="text-error mt-2 text-sm"
          data-test="migration-banner-error"
        >
          Last attempt failed: {{ migrate.error.value.message }}
        </p>

        <div class="mt-3 flex gap-3">
          <UButton
            :loading="migrate.isPending.value"
            :disabled="migrate.isPending.value || isInconsistent"
            color="primary"
            @click="onRun"
            data-test="migrate-from-previous-button"
          >
            Migrate from previous Officer
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import { useQueryClient } from '@tanstack/vue-query'
import { useTeamStore } from '@/stores'
import {
  useInvestorAddress,
  useInvestorTotalSupply
} from '@/composables/investor/reads'
import {
  useMigrateShareholders,
  InconsistentSupplyError
} from '@/composables/investor/useShareholderMigration'

const teamStore = useTeamStore()
const queryClient = useQueryClient()
const toast = useToast()

const currentInvestorAddress = useInvestorAddress()
const { data: currentTotalSupply, refetch: refetchTotalSupply } = useInvestorTotalSupply()

const migrate = useMigrateShareholders()

const previousOfficerAddress = computed<Address | null>(() => {
  const prev = teamStore.currentTeamMeta.data?.currentOfficer?.previousOfficer
  return prev?.address ? (prev.address as Address) : null
})

const isInconsistent = computed(() => migrate.error.value instanceof InconsistentSupplyError)

// Visible only when there is a previous Officer to migrate from AND the new
// InvestorV1 is still empty (totalSupply === 0). Non-zero supply means
// either the migration already happened or tokens arrived through another
// path — either way, don't offer a second mint.
const showBanner = computed(() => {
  if (!previousOfficerAddress.value) return false
  if (!currentInvestorAddress.value) return false
  if (currentTotalSupply.value === undefined || currentTotalSupply.value === null) return false
  return (currentTotalSupply.value as bigint) === 0n
})

const onRun = async () => {
  if (!previousOfficerAddress.value || !currentInvestorAddress.value) return
  try {
    const result = await migrate.mutateAsync({
      previousOfficerAddress: previousOfficerAddress.value,
      newInvestorAddress: currentInvestorAddress.value as Address
    })
    if (result.kind === 'done') {
      toast.add({
        title: `Migrated ${result.migratedCount} shareholder${result.migratedCount === 1 ? '' : 's'}`,
        color: 'success'
      })
    } else if (result.kind === 'noop-already-migrated') {
      toast.add({ title: 'Shareholders were already migrated', color: 'success' })
    } else if (result.kind === 'noop-empty') {
      toast.add({ title: 'No shareholders to migrate', color: 'info' })
    }
    await refetchTotalSupply()
    await queryClient.invalidateQueries({ queryKey: ['contracts'] })
  } catch {
    // Error surfaced via migrate.error in the banner.
  }
}
</script>
