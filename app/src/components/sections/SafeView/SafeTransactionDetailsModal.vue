<template>
  <UModal
    v-model:open="isOpen"
    title="Transaction Details"
    :ui="{ content: 'sm:max-w-xl', body: 'max-h-none overflow-visible' }"
    :close="{ onClick: handleClose }"
    data-test="transaction-details-modal"
  >
    <template #body>
      <div v-if="transaction" class="flex w-full flex-col gap-4">
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-sm text-gray-700">{{ actionSummary }}</p>
        </div>

        <div class="space-y-2 rounded-lg border p-3">
          <div
            v-for="(detail, detailIndex) in displayDetails"
            :key="`${detail.label}-${detailIndex}`"
            class="flex items-start justify-between gap-4 border-b border-gray-100 py-2 last:border-b-0"
          >
            <span class="text-sm text-gray-500">{{ detail.label }}</span>
            <span v-if="detail.type === 'address'" class="font-mono text-sm break-all">
              <AddressToolTip :address="detail.value" slice />
            </span>
            <span v-else class="text-sm font-medium break-all">{{ detail.value }}</span>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <UButton color="neutral" variant="ghost" @click="handleClose">Close</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SafeTransaction } from '@/types/safe'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { formatSafeTransactionValue, getSafeTransactionMethod } from '@/utils'
import { formatDateShort } from '@/utils/dayUtils'

interface Props {
  transaction: SafeTransaction | null
}

interface DetailItem {
  label: string
  value: string
  type?: 'text' | 'address'
}

const props = defineProps<Props>()

const isOpen = defineModel<boolean>({ required: true })

const handleClose = () => {
  isOpen.value = false
}

const normalizeText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '...'
  return String(value)
}

const isAddressLike = (value: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

const normalizedMethod = computed(() => {
  if (!props.transaction) return ''
  return getSafeTransactionMethod(props.transaction)
})

const findParameterValue = (possibleNames: string[], fallbackIndex?: number): string => {
  const parameters = props.transaction?.dataDecoded?.parameters ?? []
  const found = parameters.find((parameter) =>
    possibleNames.includes(parameter.name.toLowerCase().trim())
  )

  if (found?.value) return normalizeText(found.value)

  if (fallbackIndex !== undefined && parameters[fallbackIndex]) {
    return normalizeText(parameters[fallbackIndex].value)
  }

  return '...'
}

const formatThresholdChange = (nextThreshold: string): string => {
  const currentThreshold = props.transaction?.confirmationsRequired
  if (currentThreshold === undefined || nextThreshold === '...') return nextThreshold
  return `${currentThreshold} -> ${nextThreshold}`
}

const formatThresholdChangeText = (nextThreshold: string): string => {
  const currentThreshold = props.transaction?.confirmationsRequired
  if (currentThreshold === undefined || nextThreshold === '...') return nextThreshold
  return `${currentThreshold} to ${nextThreshold}`
}

const transferRecipient = computed(() => {
  const transaction = props.transaction
  if (!transaction) return '...'

  const recipientFromParams = findParameterValue(['to', '_to', 'recipient'], 0)
  return recipientFromParams === '...' ? normalizeText(transaction.to) : recipientFromParams
})

const methodDetails = computed<DetailItem[]>(() => {
  const transaction = props.transaction
  if (!transaction) return []

  switch (normalizedMethod.value) {
    case 'transfer': {
      return [
        {
          label: 'Recipient',
          value: transferRecipient.value,
          type: isAddressLike(transferRecipient.value) ? 'address' : 'text'
        },
        {
          label: 'Amount',
          value: formatSafeTransactionValue(
            transaction.value.toString(),
            transaction.dataDecoded ?? undefined,
            transaction.to
          ),
          type: 'text'
        }
      ]
    }
    case 'addownerwiththreshold': {
      const newOwner = findParameterValue(['owner', '_owner', 'newowner'], 0)
      return [
        {
          label: 'New Signer',
          value: newOwner,
          type: isAddressLike(newOwner) ? 'address' : 'text'
        }
      ]
    }
    case 'removeowner': {
      const removedOwner = findParameterValue(['owner', '_owner'], 1)
      return [
        {
          label: 'Signer To Remove',
          value: removedOwner,
          type: isAddressLike(removedOwner) ? 'address' : 'text'
        }
      ]
    }
    case 'swapowner': {
      const oldOwner = findParameterValue(['oldowner', '_oldowner'], 1)
      const newOwner = findParameterValue(['newowner', '_newowner'], 2)
      return [
        {
          label: 'Old Signer',
          value: oldOwner,
          type: isAddressLike(oldOwner) ? 'address' : 'text'
        },
        {
          label: 'New Signer',
          value: newOwner,
          type: isAddressLike(newOwner) ? 'address' : 'text'
        }
      ]
    }
    case 'changethreshold': {
      const newThreshold = findParameterValue(['threshold', '_threshold'], 0)
      return [
        {
          label: 'Required Approvals Change',
          value: formatThresholdChange(newThreshold),
          type: 'text'
        }
      ]
    }
    case 'enablemodule':
    case 'disablemodule': {
      const moduleAddress =
        normalizedMethod.value === 'disablemodule'
          ? findParameterValue(['module', '_module'], 1)
          : findParameterValue(['module', '_module'], 0)

      return [
        {
          label: 'Module',
          value: moduleAddress,
          type: isAddressLike(moduleAddress) ? 'address' : 'text'
        }
      ]
    }
    case 'setguard': {
      const guardAddress = findParameterValue(['guard', '_guard'], 0)
      return [
        {
          label: 'Guard Address',
          value: guardAddress,
          type: isAddressLike(guardAddress) ? 'address' : 'text'
        }
      ]
    }
    case 'setfallbackhandler': {
      const handlerAddress = findParameterValue(['handler', '_handler', 'fallbackhandler'], 0)
      return [
        {
          label: 'Fallback Handler',
          value: handlerAddress,
          type: isAddressLike(handlerAddress) ? 'address' : 'text'
        }
      ]
    }
    default:
      return []
  }
})

const displayDetails = computed<DetailItem[]>(() => {
  const transaction = props.transaction
  if (!transaction) return []

  const targetValue = normalizeText(transaction.to)
  const shouldShowTarget = !(
    normalizedMethod.value === 'transfer' &&
    transferRecipient.value.toLowerCase() === targetValue.toLowerCase()
  )

  const baseDetails: DetailItem[] = [
    {
      label: 'Approvals',
      value: `${transaction.confirmations?.length || 0} / ${transaction.confirmationsRequired}`,
      type: 'text'
    },
    {
      label: 'Submitted',
      value: formatDateShort(transaction.submissionDate),
      type: 'text'
    },
    {
      label: 'Executed',
      value: transaction.executionDate
        ? formatDateShort(transaction.executionDate)
        : 'Not executed',
      type: 'text'
    }
  ]

  if (shouldShowTarget) {
    baseDetails.unshift({
      label: 'Target',
      value: targetValue,
      type: isAddressLike(targetValue) ? 'address' : 'text'
    })
  }

  return [...methodDetails.value, ...baseDetails]
})

const actionSummary = computed(() => {
  switch (normalizedMethod.value) {
    case 'transfer': {
      return `This transaction sends funds from the Safe to ${transferRecipient.value}.`
    }
    case 'addownerwiththreshold': {
      const newOwner = findParameterValue(['owner', '_owner', 'newowner'], 0)
      return `This transaction adds signer ${newOwner}.`
    }
    case 'removeowner': {
      const removedOwner = findParameterValue(['owner', '_owner'], 1)
      return `This transaction removes signer ${removedOwner}.`
    }
    case 'swapowner': {
      const oldOwner = findParameterValue(['oldowner', '_oldowner'], 1)
      const newOwner = findParameterValue(['newowner', '_newowner'], 2)
      return `This transaction replaces signer ${oldOwner} with ${newOwner}.`
    }
    case 'changethreshold': {
      const newThreshold = findParameterValue(['threshold', '_threshold'], 0)
      return `This transaction changes required approvals from ${formatThresholdChangeText(newThreshold)}.`
    }
    case 'enablemodule':
      return 'This transaction enables a Safe module.'
    case 'disablemodule':
      return 'This transaction disables a Safe module.'
    case 'setguard':
      return 'This transaction updates the Safe security guard contract.'
    case 'setfallbackhandler':
      return 'This transaction updates the Safe fallback handler contract.'
    default:
      return 'This is a contract interaction initiated by the Safe.'
  }
})
</script>
