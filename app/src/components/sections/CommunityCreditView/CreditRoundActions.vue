<template>
  <UButton
    v-for="action in actions"
    :key="action.test"
    :color="action.color"
    :variant="action.variant"
    :icon="action.icon"
    :label="action.label"
    :loading="action.loading"
    :data-test="action.test"
    @click="emitAction(action.emit)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isRepayableRoundStatus } from '@/utils'
import type { CreditRound } from '@/types'

interface Props {
  round: CreditRound
  isOwner: boolean
  isLendAllowed: boolean
  isRepaymentAvailable: boolean
  isRefundPending: boolean
  isPartialFundingPending: boolean
}

type ActionEvent = 'lend' | 'repay' | 'refund' | 'acceptPartialFunding'

type RoundAction = {
  test: string
  label: string
  icon: string
  color: 'primary' | 'warning'
  variant: 'solid' | 'soft'
  loading?: boolean
  emit: ActionEvent
}

const props = defineProps<Props>()
const emit = defineEmits<{
  lend: [round: CreditRound]
  repay: []
  refund: []
  acceptPartialFunding: []
}>()

const actions = computed<RoundAction[]>(() => {
  const { round } = props
  if (round.status === 'open') {
    return props.isLendAllowed
      ? [
          {
            test: 'round-cta-lend',
            label: 'Lend now',
            icon: 'heroicons:hand-raised',
            color: 'primary',
            variant: 'solid',
            emit: 'lend'
          }
        ]
      : []
  }
  if (!props.isOwner) return []
  if (isRepayableRoundStatus(round.status) && props.isRepaymentAvailable) {
    return [
      {
        test: 'round-cta-repay',
        label: 'Repay round',
        icon: 'heroicons:arrow-uturn-left',
        color: 'primary',
        variant: 'solid',
        emit: 'repay'
      }
    ]
  }
  if (round.status !== 'stalled') return []

  const actions: RoundAction[] = [
    {
      test: 'round-cta-refundable',
      label: 'Refund lenders',
      icon: 'heroicons:arrow-uturn-left',
      color: 'warning',
      variant: 'soft',
      loading: props.isRefundPending,
      emit: 'refund'
    }
  ]
  if (round.raised > 0) {
    actions.push({
      test: 'round-cta-accept-partial',
      label: 'Accept raised funds',
      icon: 'heroicons:check-circle',
      color: 'primary',
      variant: 'soft',
      loading: props.isPartialFundingPending,
      emit: 'acceptPartialFunding'
    })
  }
  return actions
})

function emitAction(action: ActionEvent) {
  if (action === 'lend') emit('lend', props.round)
  else if (action === 'repay') emit('repay')
  else if (action === 'refund') emit('refund')
  else emit('acceptPartialFunding')
}
</script>
