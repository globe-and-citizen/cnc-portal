<template>
  <UCard class="border-info border" data-test="migration-owner-sweep">
    <div class="flex items-start gap-3">
      <UIcon name="i-heroicons-sparkles" class="text-info mt-1 h-5 w-5 shrink-0" />
      <div class="flex-1">
        <p class="font-semibold">Dispatch migrated shares (owner only)</p>
        <p class="mt-1 text-sm">
          Dispatch the frozen snapshot to all shareholders. Already claimed shareholders are skipped
          on-chain. Complete the migration separately when no more claims are expected.
        </p>

        <UAlert
          v-if="
            (sweep.isError.value && sweep.error.value) ||
            (completion.isError.value && completion.error.value)
          "
          color="error"
          variant="soft"
          icon="i-heroicons-x-circle"
          title="Migration action failed"
          :description="sweep.error.value?.message ?? completion.error.value?.message"
          class="mt-3"
          data-test="migration-owner-error"
        />

        <div class="mt-3 flex flex-wrap items-center gap-3">
          <p class="mb-2 text-xs text-gray-500">
            Snapshot contains {{ shareholderCount }} shareholder{{
              shareholderCount === 1 ? '' : 's'
            }}
          </p>
          <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
            <UButton
              :loading="sweep.isPending.value"
              :disabled="sweep.isPending.value || archivedDisabled || snapshotClaimCount === 0"
              color="info"
              @click="onDispatch"
              data-test="dispatch-button"
            >
              Dispatch remaining claims
            </UButton>
            <UButton
              :loading="completion.isPending.value"
              :disabled="sweep.isPending.value || completion.isPending.value || archivedDisabled"
              color="neutral"
              variant="outline"
              @click="onComplete"
              data-test="complete-migration-button"
            >
              Complete migration
            </UButton>
          </TeamArchivedTooltip>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type Address } from 'viem'
import {
  useCompleteMigrationMutation,
  useSweepMigrationMutation
} from '@/composables/investor/useSweepMigration'
import { useToast } from '@nuxt/ui/composables'
import TeamArchivedTooltip from '@/components/TeamArchivedTooltip.vue'
import type { InvestorMigration } from '@/queries/investorMigration.queries'

interface Props {
  investorV2Address: Address
  migrationData: InvestorMigration | undefined
}

const props = defineProps<Props>()

const toast = useToast()
const sweep = useSweepMigrationMutation()
const completion = useCompleteMigrationMutation()

const shareholdersWithProofs = computed(() => {
  if (!props.migrationData?.shareholders) return []
  return props.migrationData.shareholders.filter((sh) => {
    const proof = props.migrationData?.proofs?.[sh.shareholder.toLowerCase()]
    return Array.isArray(proof)
  })
})

const snapshotClaimCount = computed(() => shareholdersWithProofs.value.length)
const shareholderCount = computed(() => props.migrationData?.shareholders?.length ?? 0)

const onDispatch = async () => {
  if (snapshotClaimCount.value === 0) {
    toast.add({
      title: 'Migration proofs unavailable',
      description: 'The shareholder migration snapshot does not contain claim proofs',
      color: 'error'
    })
    return
  }

  sweep.mutate(
    {
      investorV2Address: props.investorV2Address,
      holders: shareholdersWithProofs.value.map((sh) => sh.shareholder as Address),
      amounts: shareholdersWithProofs.value.map((sh) => BigInt(sh.amount)),
      proofs: shareholdersWithProofs.value.map(
        (sh) => props.migrationData?.proofs[sh.shareholder.toLowerCase()] ?? []
      )
    },
    {
      onSuccess: () => {
        toast.add({
          title: 'Claims dispatched!',
          description: `${snapshotClaimCount.value} snapshot claim${snapshotClaimCount.value === 1 ? '' : 's'} processed`,
          color: 'success'
        })
      }
    }
  )
}

const onComplete = () => {
  completion.mutate(props.investorV2Address, {
    onSuccess: () => {
      toast.add({
        title: 'Migration completed!',
        description: 'The migration is closed and no further claims can be made.',
        color: 'success'
      })
    }
  })
}
</script>
