<template>
  <FeeCollectorLegacyView
    version="V0"
    :native-balance="nativeBalance"
    :owner="owner"
    :fee-configs="feeConfigs"
    :is-loading="isLoading"
    :balance-error="!!balanceError"
    :owner-error="!!ownerError"
    :configs-error="!!configsError"
    :native-symbol="nativeSymbol"
  >
    <template v-if="isOwner" #actions>
      <FeeCollectorLegacyActions
        version="V0"
        :withdraw-all="withdrawAll"
        :withdraw-token="withdrawToken"
        :set-fee="setFee"
        :transfer-ownership="transferOwnership"
        :add-token-support="addTokenSupport"
        :remove-token-support="removeTokenSupport"
      />
    </template>
  </FeeCollectorLegacyView>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConnection } from '@wagmi/vue'
import type { Address } from 'viem'
import {
  isFeeCollectorOwner,
  useFeeBalance,
  useFeeCollectorOwner,
  useFeeConfigs
} from '~/composables/FeeCollector/v0/read'
import {
  useAddTokenSupport,
  useRemoveTokenSupport,
  useSetFee,
  useTransferOwnership,
  useWithdrawAll,
  useWithdrawToken
} from '~/composables/FeeCollector/v0/writes'
import FeeCollectorLegacyView from './FeeCollectorLegacyView.vue'
import FeeCollectorLegacyActions from './FeeCollectorLegacyActions.vue'

const connection = useConnection()
const nativeSymbol = computed(() => connection.chain.value?.nativeCurrency.symbol || 'MATIC')

const { data: nativeBalance, isLoading: isLoadingBalance, error: balanceError } = useFeeBalance()
const { data: ownerData, isLoading: isLoadingOwner, error: ownerError } = useFeeCollectorOwner()
const { data: feeConfigsData, isLoading: isLoadingConfigs, error: configsError } = useFeeConfigs()

const owner = computed(() => ownerData.value as Address | undefined)
const feeConfigs = computed(() =>
  (feeConfigsData.value as readonly { contractType: string, feeBps: bigint }[] | undefined) ?? []
)
const isLoading = computed(() =>
  isLoadingBalance.value || isLoadingOwner.value || isLoadingConfigs.value
)
const isOwner = isFeeCollectorOwner()

// Write mutations, statically bound to the V0 deployment.
const withdrawAll = useWithdrawAll()
const withdrawToken = useWithdrawToken()
const setFee = useSetFee()
const transferOwnership = useTransferOwnership()
const addTokenSupport = useAddTokenSupport()
const removeTokenSupport = useRemoveTokenSupport()
</script>
