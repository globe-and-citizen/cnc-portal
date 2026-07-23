<template>
  <UCard class="border-success border" data-test="merkle-claim-form">
    <div class="flex items-start gap-3">
      <UIcon name="i-heroicons-check-circle" class="text-success mt-1 h-5 w-5 shrink-0" />
      <div class="flex-1">
        <p class="font-semibold">Claim migrated shares</p>
        <p class="mt-1 text-sm">
          The migration root has been set. You can now claim your shares from the previous Investor
          contract. The amount is taken from the frozen migration snapshot.
        </p>

        <UAlert
          v-if="claim.isError.value && claim.error.value"
          color="error"
          variant="soft"
          icon="i-heroicons-x-circle"
          title="Claim failed"
          :description="claim.error.value.message"
          class="mt-3"
          data-test="claim-error"
        />

        <div class="mt-3 space-y-3">
          <div>
            <label class="text-sm font-medium">Your claim amount</label>
            <UInput
              :model-value="formattedUserAmount ?? ''"
              type="text"
              readonly
              disabled
              data-test="claim-amount-input"
            />
            <p class="mt-1 text-xs text-gray-500">
              {{
                formattedUserAmount
                  ? `From snapshot at block ${migrationData?.blockNumber}`
                  : 'Your address is not present in this migration snapshot'
              }}
            </p>
          </div>

          <UButton
            :loading="claim.isPending.value"
            :disabled="!userAmount || !userProof || claim.isPending.value || !migrationData"
            color="success"
            @click="onClaim"
            data-test="claim-button"
          >
            Claim shares
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type Address, type Hex, formatUnits } from 'viem'
import { useClaimMigrationMutation } from '@/composables/investor/useClaimMigration'
import { useToast } from '@nuxt/ui/composables'
import type { InvestorMigration } from '@/queries/investorMigration.queries'

interface Props {
  investorV2Address: Address
  migrationData: InvestorMigration | undefined
  userAddress: Address | undefined
}

const props = defineProps<Props>()

const toast = useToast()
const claim = useClaimMigrationMutation()

const userProof = computed<Hex[] | null>(() => {
  if (!props.userAddress || !props.migrationData?.proofs) return null
  return props.migrationData.proofs[props.userAddress.toLowerCase()] ?? null
})

const userAmount = computed<string | null>(() => {
  if (!props.userAddress || !props.migrationData?.shareholders) return null
  const sh = props.migrationData.shareholders.find(
    (s) => s.shareholder.toLowerCase() === props.userAddress?.toLowerCase()
  )
  return sh?.amount ?? null
})

const formattedUserAmount = computed(() => {
  if (!userAmount.value) return null
  return formatUnits(BigInt(userAmount.value), 6)
})

const onClaim = async () => {
  if (!userProof.value || !userAmount.value) {
    toast.add({
      title: 'Error',
      description: 'You are not in the shareholder list or proof not found',
      color: 'error'
    })
    return
  }

  const amount = BigInt(userAmount.value)

  claim.mutate(
    {
      investorV2Address: props.investorV2Address,
      amount,
      proof: userProof.value
    },
    {
      onSuccess: () => {
        toast.add({
          title: 'Shares claimed!',
          description: `You successfully claimed ${formattedUserAmount.value} shares`,
          color: 'success'
        })
      }
    }
  )
}
</script>
