<template>
  <UCard v-if="showBanner" class="border-warning border" data-test="shareholder-migration-banner">
    <div class="flex items-start gap-3">
      <UIcon name="i-heroicons-arrow-path" class="text-warning mt-1 h-5 w-5 shrink-0" />
      <div class="flex-1">
        <p class="font-semibold">Shareholder migration pending</p>
        <p class="mt-1 text-sm">
          A new Officer was deployed for this team but the previous share token holders' migration
          root has not been committed on the new Investor contract yet. Click below to read the
          previous shareholders on-chain and commit their claim allocation here — each holder then
          self-claims their balance.
        </p>

        <UAlert
          v-if="migrate.isError.value && migrate.error.value"
          color="error"
          variant="soft"
          icon="i-heroicons-x-circle"
          title="Last migration attempt failed"
          :description="migrate.error.value.message"
          class="mt-3"
          data-test="migration-banner-error"
        />

        <div class="mt-3 flex gap-3">
          <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
            <UButton
              :loading="migrate.isPending.value"
              :disabled="migrate.isPending.value || archivedDisabled"
              color="primary"
              @click="onRun"
              data-test="migrate-from-previous-button"
            >
              Migrate from previous Officer
            </UButton>
          </TeamArchivedTooltip>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { zeroHash, type Address } from 'viem'
import { useQueryClient } from '@tanstack/vue-query'
import { useTeamStore } from '@/stores'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import { useInvestorV2Address, useInvestorV2MigrationRoot } from '@/composables/investor/readsV2'
import { useMigrateShareholders } from '@/composables/investor/useShareholderMigration'

const teamStore = useTeamStore()
const queryClient = useQueryClient()

const currentInvestorAddress = useInvestorV2Address()
const { data: currentMigrationRoot, refetch: refetchMigrationRoot } = useInvestorV2MigrationRoot()

const migrate = useMigrateShareholders()

const previousOfficerAddress = computed<Address | null>(() => {
  const prev = teamStore.currentTeamMeta.data?.currentOfficer?.previousOfficer
  return prev?.address ? (prev.address as Address) : null
})

// Visible only when there is a previous Officer to migrate from AND the new
// Investor has no migration root set yet. Once a root is committed, holders
// self-claim from the Share Token page — this banner's job is done.
const showBanner = computed(() => {
  if (!previousOfficerAddress.value) return false
  if (!currentInvestorAddress.value) return false
  if (currentMigrationRoot.value === undefined || currentMigrationRoot.value === null) return false
  return currentMigrationRoot.value === zeroHash
})

const onRun = () => {
  if (!previousOfficerAddress.value || !currentInvestorAddress.value) return
  const teamId = teamStore.currentTeamId
  if (!teamId) return
  // Fire-and-forget: outcome toasts come from useMigrateShareholders default
  // onSuccess, errors are rendered inline via migrate.error on the banner.
  migrate.mutate(
    {
      teamId,
      previousOfficerAddress: previousOfficerAddress.value,
      newInvestorAddress: currentInvestorAddress.value as Address
    },
    {
      onSuccess: async () => {
        await refetchMigrationRoot()
        await queryClient.invalidateQueries({ queryKey: ['contracts'] })
      }
    }
  )
}
</script>
