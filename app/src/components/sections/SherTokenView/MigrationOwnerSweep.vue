<template>
  <UCard class="border-info border" data-test="migration-owner-sweep">
    <div class="flex items-start gap-3">
      <UIcon name="i-heroicons-sparkles" class="text-info mt-1 h-5 w-5 shrink-0" />
      <div class="flex-1">
        <p class="font-semibold">Complete migration (owner only)</p>
        <p class="mt-1 text-sm">
          Bulk claim any unclaimed shares and close the migration. Already claimed shareholders are
          skipped on-chain. Only the team owner can perform this action.
        </p>

        <UAlert
          v-if="sweep.isError.value && sweep.error.value"
          color="error"
          variant="soft"
          icon="i-heroicons-x-circle"
          title="Sweep failed"
          :description="sweep.error.value.message"
          class="mt-3"
          data-test="sweep-error"
        />

        <div class="mt-3">
          <p class="mb-2 text-xs text-gray-500">
            Will process {{ unclaimedCount }} shareholder{{ unclaimedCount === 1 ? '' : 's' }}
          </p>
          <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
            <UButton
              :loading="sweep.isPending.value"
              :disabled="sweep.isPending.value || archivedDisabled || unclaimedCount === 0"
              color="info"
              @click="onSweep"
              data-test="sweep-button"
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
import { useSweepMigrationMutation } from '@/composables/investor/useSweepMigration'
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

const shareholdersWithProofs = computed(() => {
  if (!props.migrationData?.shareholders) return []
  return props.migrationData.shareholders.filter((sh) => {
    const proof = props.migrationData?.proofs?.[sh.shareholder.toLowerCase()]
    return Array.isArray(proof)
  })
})

const unclaimedCount = computed(() => shareholdersWithProofs.value.length)

const onSweep = async () => {
  if (shareholdersWithProofs.value.length === 0) {
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
          title: 'Migration completed!',
          description: `${unclaimedCount.value} shareholder${unclaimedCount.value === 1 ? '' : 's'} minted`,
          color: 'success'
        })
      }
    }
  )
}
</script>
