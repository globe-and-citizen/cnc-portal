<template>
  <UCard class="border-success border" data-test="merkle-claim-form">
    <div class="flex items-start gap-3">
      <UIcon name="i-heroicons-check-circle" class="text-success mt-1 h-5 w-5 shrink-0" />
      <div class="flex-1">
        <p class="font-semibold">Claim migrated shares</p>
        <p class="mt-1 text-sm">
          The migration root has been set. You can now claim your shares from the previous Investor
          contract. Enter your claim amount below.
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
              v-model="claimAmount"
              type="text"
              placeholder="0.00"
              :disabled="claim.isPending.value"
              data-test="claim-amount-input"
            />
            <p class="mt-1 text-xs text-gray-500">
              From snapshot at block {{ migrationData?.blockNumber }}
            </p>
          </div>

          <UButton
            :loading="claim.isPending.value"
            :disabled="!claimAmount || claim.isPending.value || !migrationData"
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
import { ref, computed } from 'vue'
import { type Address } from 'viem'
import { parseUnits } from 'viem'
import { useClaimMigrationMutation } from '@/composables/investor/useClaimMigration'
import { useToast } from '@nuxt/ui/composables'

interface Props {
  investorV2Address: Address
  migrationData: any
  userAddress: Address | undefined
}

const props = defineProps<Props>()

const toast = useToast()
const claim = useClaimMigrationMutation()
const claimAmount = ref('')

const userProof = computed(() => {
  if (!props.userAddress || !props.migrationData?.proofs) return null
  return props.migrationData.proofs[props.userAddress.toLowerCase()]
})

const userAmount = computed(() => {
  if (!props.userAddress || !props.migrationData?.shareholders) return null
  const sh = props.migrationData.shareholders.find(
    (s: any) => s.address.toLowerCase() === props.userAddress?.toLowerCase()
  )
  return sh?.amount
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

  const amount = parseUnits(claimAmount.value, 6) // Assuming 6 decimals

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
          description: `You successfully claimed ${claimAmount.value} shares`,
          color: 'success'
        })
        claimAmount.value = ''
      }
    }
  )
}
</script>
