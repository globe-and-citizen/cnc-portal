<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Total Balance -->
    <UCard>
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Total Balance (USD)
          </p>
          <p class="text-2xl font-bold mt-1">
            <span v-if="isLoading">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            </span>
            <span v-else-if="error" class="text-red-600 dark:text-red-400 text-base">
              Failed to load balance
            </span>
            <span v-else>{{ formattedTotalUsd }}</span>
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span v-if="error">Please try again later</span>
            <span v-else>Available to withdraw</span>
          </p>
        </div>

        <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900">
          <UIcon name="i-heroicons-wallet" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </UCard>

    <!-- Owner -->
    <UCard>
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Owner
            </p>
            <UButton
              v-if="isOwnerOfCollector"
              size="xs"
              color="primary"
              variant="soft"
              :disabled="isLoadingOwner"
              @click="isTransferModalOpen = true"
            >
              Transfer
            </UButton>
          </div>
          <div class="mt-2">
            <span v-if="isLoadingOwner">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            </span>
            <span v-else-if="errorOwner" class="text-red-600 dark:text-red-400 text-sm">
              Failed to load owner
            </span>
            <UserIdentity v-else :address="owner" />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Controls fee config and withdrawals
          </p>
        </div>

        <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-900">
          <UIcon name="i-heroicons-key" class="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
      </div>
    </UCard>

    <!-- Fee Beneficiary -->
    <UCard>
      <div class="flex items-center justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Fee Beneficiary
            </p>
            <UButton
              v-if="isOwnerOfCollector"
              size="xs"
              color="primary"
              variant="soft"
              :disabled="isLoadingBeneficiary"
              @click="isBeneficiaryModalOpen = true"
            >
              Change
            </UButton>
          </div>
          <div class="mt-2">
            <span v-if="isLoadingBeneficiary || (isBeneficiaryUnset && isLoadingOwner)">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            </span>
            <span v-else-if="errorBeneficiary" class="text-red-600 dark:text-red-400 text-sm">
              Failed to load beneficiary
            </span>
            <UserIdentity v-else :address="displayBeneficiary" />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span v-if="isBeneficiaryUnset">Fallback → owner</span>
            <span v-else>Receives swept fees</span>
          </p>
        </div>

        <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-green-100 dark:bg-green-900">
          <UIcon name="i-heroicons-arrow-down-on-square" class="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
      </div>
    </UCard>

    <BeneficiaryFormModal v-model:model-value="isBeneficiaryModalOpen" />
    <TransferOwnershipModal v-model:model-value="isTransferModalOpen" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { zeroAddress, type Address } from 'viem'
import { useFeeCollector } from '@/composables/useFeeCollector'
import {
  isFeeCollectorOwner,
  useFeeCollectorBeneficiary,
  useFeeCollectorOwner
} from '~/composables/FeeCollector/read'
import BeneficiaryFormModal from './BeneficiaryFormModal.vue'
import TransferOwnershipModal from './TransferOwnershipModal.vue'
import UserIdentity from '@/components/UserIdentity.vue'

// Total balance (existing)
const { isLoading, error, formattedTotalUsd } = useFeeCollector()

// Owner
const {
  data: ownerData,
  isLoading: isLoadingOwner,
  error: errorOwner
} = useFeeCollectorOwner()
const owner = computed(() => ownerData.value as Address | undefined)

// Beneficiary — when unset (zeroAddress) the contract falls back to owner(),
// so we surface the owner's address instead and label it as a fallback.
const {
  data: beneficiaryData,
  isLoading: isLoadingBeneficiary,
  error: errorBeneficiary
} = useFeeCollectorBeneficiary()
const beneficiary = computed(() => beneficiaryData.value as Address | undefined)
const isBeneficiaryUnset = computed(() =>
  beneficiary.value !== undefined && beneficiary.value === zeroAddress
)
const displayBeneficiary = computed<Address | undefined>(() => {
  if (beneficiary.value === undefined) return undefined
  return isBeneficiaryUnset.value ? owner.value : beneficiary.value
})

// Owner-gated actions
const isOwnerOfCollector = isFeeCollectorOwner()
const isBeneficiaryModalOpen = ref(false)
const isTransferModalOpen = ref(false)
</script>
