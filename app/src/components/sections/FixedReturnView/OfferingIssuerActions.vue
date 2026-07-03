<template>
  <UCard>
    <template #header>
      <div class="text-base font-extrabold text-[#0f3d2e]">Issuer actions</div>
    </template>

    <!-- Repay lenders — Funded or Repaying -->
    <div v-if="offering.status === 'funded'" class="flex items-center justify-between gap-4">
      <div>
        <div class="text-sm font-semibold text-[#0f3d2e]">Repay lenders</div>
        <div class="text-xs text-[#9aaba2]">
          {{
            offering.totalRepaid > 0
              ? 'Continue repayment installments.'
              : 'Push principal + interest to all lenders proportionally.'
          }}
        </div>
      </div>
      <UButton
        color="primary"
        icon="heroicons:arrow-up-circle"
        :label="offering.totalRepaid > 0 ? 'Continue repayment' : 'Repay lenders'"
        data-test="repay-lenders-button"
        @click="repayModalOpen = true"
      />
    </div>

    <!-- Mark as Refundable — Open only, after subscription deadline -->
    <div
      v-if="offering.status === 'open' && isDeadlinePassed"
      class="flex items-center justify-between gap-4"
    >
      <div>
        <div class="text-sm font-semibold text-[#0f3d2e]">Mark as refundable</div>
        <div class="text-xs text-[#9aaba2]">
          Available once the subscription deadline has passed without reaching the funding target.
          Lenders will then be able to claim their principal back.
        </div>
      </div>
      <UButton
        color="warning"
        variant="soft"
        icon="heroicons:arrow-uturn-left"
        label="Mark refundable"
        data-test="mark-refundable-button"
        :loading="markAsRefundableResult.isPending.value"
        @click="markRefundable"
      />
    </div>

    <RepayLendersModal v-model:open="repayModalOpen" :offering="offering" />
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { useQueryClient } from '@tanstack/vue-query'
import RepayLendersModal from './RepayLendersModal.vue'
import { useFixedReturnMarkAsRefundable } from '@/composables/fixedReturn/writes'
import { useBlockTimestamp } from '@/composables/useBlockTimestamp'
import type { OfferingSummary } from '@/types'

const props = defineProps<{ offering: OfferingSummary }>()

const blockTimestamp = useBlockTimestamp()
const isDeadlinePassed = computed(
  () =>
    blockTimestamp.value !== null && blockTimestamp.value > BigInt(props.offering.deadlineTimestamp)
)

const repayModalOpen = ref(false)
const toast = useToast()
const queryClient = useQueryClient()
const markAsRefundableResult = useFixedReturnMarkAsRefundable()

function markRefundable() {
  if (markAsRefundableResult.isPending.value) return
  markAsRefundableResult.mutate(
    { args: [BigInt(props.offering.id)] },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['fixedReturnAllOffers'] })
        toast.add({
          title: 'Offering marked as refundable',
          description: 'Lenders can now claim their principal.',
          color: 'success'
        })
      }
    }
  )
}
</script>
