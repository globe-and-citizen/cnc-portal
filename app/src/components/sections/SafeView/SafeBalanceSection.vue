<template>
  <UCard :ui="{ root: 'shadow-md' }" data-test="safe-wallet-overview-card">
    <template #header>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold">Wallet overview</h3>
          <p class="mt-1 text-sm text-gray-500">
            Balance, approval policy, and primary wallet actions.
          </p>
        </div>
        <div v-if="address" class="min-w-0 text-left sm:text-right">
          <p class="text-xs font-medium text-gray-500">Safe address</p>
          <AddressTooltip :address="address" class="mt-1 max-w-full" />
        </div>
      </div>
    </template>

    <UAlert
      v-if="balanceError || safeInfoError"
      class="mb-5"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Some wallet details are unavailable"
      description="The Safe address remains available. Check your connection and retry the balance and signer details."
      data-test="safe-overview-error"
    >
      <template #actions>
        <UButton
          color="error"
          variant="outline"
          size="xs"
          label="Try again"
          data-test="retry-safe-overview-button"
          @click="retryOverview"
        />
      </template>
    </UAlert>

    <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="text-sm font-medium text-gray-500">Total wallet value</p>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="inline-block min-h-10 text-3xl font-bold sm:text-4xl">
            <UIcon
              v-if="isLoading"
              name="i-lucide-loader-circle"
              class="text-primary h-9 w-9 animate-spin"
              data-test="safe-balance-loading"
            />
            <span v-else>{{ balance?.total.usd.formatted ?? '—' }}</span>
          </span>
          <span class="text-sm text-gray-600">USD</span>
        </div>
        <p class="mt-1 text-sm text-gray-500">
          ≈ {{ balance?.total.local.formatted ?? '—' }} {{ currency.code }}
        </p>

        <div class="mt-5 flex flex-wrap gap-3">
          <div class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
            <p class="text-xs text-gray-500">Required approvals</p>
            <p class="mt-1 font-semibold" data-test="safe-threshold-summary">
              {{ safeInfo?.threshold ?? '—' }} of {{ safeInfo?.owners.length ?? '—' }} signers
            </p>
          </div>
          <div class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
            <p class="text-xs text-gray-500">Your role</p>
            <p class="mt-1 font-semibold" data-test="safe-user-role">
              {{ roleLabel }}
            </p>
          </div>
        </div>
      </div>

      <div class="w-full lg:max-w-xl">
        <UAlert
          class="mb-4"
          :color="isSafeInfoLoading ? 'neutral' : isConnectedUserOwner ? 'success' : 'info'"
          variant="soft"
          :icon="isConnectedUserOwner ? 'i-lucide-key-round' : 'i-lucide-info'"
          :title="roleNoticeTitle"
          :description="roleDescription"
          data-test="safe-role-notice"
        />

        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
            <UButton
              color="secondary"
              leading-icon="i-lucide-plus"
              label="Deposit funds"
              :disabled="archivedDisabled"
              class="justify-center"
              data-test="deposit-button"
              @click="openDepositModal"
            />
          </TeamArchivedTooltip>

          <UButton
            color="secondary"
            leading-icon="i-lucide-arrow-right-left"
            label="Create transfer"
            :disabled="!isConnectedUserOwner"
            :title="transferPermissionHint"
            class="justify-center"
            data-test="transfer-button"
            @click="openTransferModal"
          />

          <UButton
            v-if="address"
            color="primary"
            leading-icon="i-lucide-external-link"
            label="Open in Safe"
            class="justify-center"
            data-test="open-safe-app-button"
            @click="openInSafeApp"
          />
        </div>
      </div>
    </div>

    <UModal
      v-if="depositModal.mount"
      v-model:open="depositModal.show"
      title="Deposit funds"
      description="Send supported assets to the team Safe. Deposits do not require signer approval."
      :close="{ onClick: () => closeDepositModal() }"
      data-test="deposit-modal"
      @update:open="handleDepositModalOpen"
    >
      <template #body>
        <DepositSafeForm v-if="address" :safe-address="address" @close-modal="closeDepositModal" />
      </template>
    </UModal>

    <UModal
      v-if="transferModal.mount"
      v-model:open="transferModal.show"
      title="Create a Safe transfer"
      :description="`Current wallet balance: ${transferData.token.balance} ${transferData.token.symbol}`"
      :close="{ onClick: () => resetTransferValues() }"
      data-test="transfer-modal"
      @update:open="handleTransferModalOpen"
    >
      <template #body>
        <TransferForm
          v-model="transferData"
          :tokens="tokens"
          :loading="isTransferring"
          @transfer="handleTransfer"
          @close-modal="resetTransferValues"
        />
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import { useStorage } from '@vueuse/core'
import { useToast } from '@nuxt/ui/composables'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import { getSafeHomeUrl, openSafeAppUrl } from '@/composables/safe'
import { useUserDataStore } from '@/stores'
import { useContractBalance } from '@/composables/useContractBalance'
import { useGetSafeInfoQuery } from '@/queries/safe.queries'
import TransferForm, { type TransferModel } from '@/components/forms/TransferForm.vue'
import type { TokenOption } from '@/types'
import { useTransferFromSafeMutation } from '@/queries/safe.mutations'
import DepositSafeForm from '@/components/forms/DepositSafeForm.vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const props = defineProps<{ address: Address }>()
const chainId = useChainId()
const userDataStore = useUserDataStore()
const currency = useStorage('currency', { code: 'USD', name: 'US Dollar', symbol: '$' })
const { isWriteDisabled } = useTeamWriteGuard()

const {
  data: balance,
  isLoading,
  error: balanceError,
  refetch: refetchBalance
} = useContractBalance(props.address)
const {
  data: safeInfo,
  isLoading: isSafeInfoLoading,
  error: safeInfoError,
  refetch: refetchSafeInfo
} = useGetSafeInfoQuery({ pathParams: { safeAddress: props.address } })

const tokens = computed<TokenOption[]>(() =>
  (balance.value?.balances ?? [])
    .map((item) => ({
      symbol: item.token.symbol,
      balance: item.amount,
      tokenId: item.token.id,
      price: item.price.usd.value,
      name: item.token.name,
      code: item.token.code
    }))
    .filter((item) => item.tokenId !== 'sher')
)

const isConnectedUserOwner = computed(() => {
  if (!userDataStore.address || !safeInfo.value?.owners?.length) return false
  return safeInfo.value.owners.some(
    (owner) => owner.toLowerCase() === userDataStore.address?.toLowerCase()
  )
})

const roleDescription = computed(() =>
  isSafeInfoLoading.value
    ? 'Checking the connected wallet against the Safe owner list.'
    : isConnectedUserOwner.value
      ? 'You can propose transfers, approve pending actions, and execute transactions once the threshold is reached.'
      : 'You can review activity and deposit funds. Connect a Safe signer wallet to propose transfers or approve actions.'
)

const roleLabel = computed(() => {
  if (isSafeInfoLoading.value) return 'Checking permissions…'
  return isConnectedUserOwner.value ? 'Safe signer' : 'Viewer / depositor'
})

const roleNoticeTitle = computed(() => {
  if (isSafeInfoLoading.value) return 'Checking signer permissions'
  return isConnectedUserOwner.value
    ? 'Signer wallet connected'
    : 'Safe information is read-only for this wallet'
})

const transferPermissionHint = computed(() =>
  isConnectedUserOwner.value
    ? 'Create a transfer proposal for signer approval.'
    : 'Only a Safe signer can create a transfer proposal.'
)

const depositModal = ref({ mount: false, show: false })
const transferModal = ref({ mount: false, show: false })
const toast = useToast()
const { mutate: transferFromSafe, isPending: isTransferring, reset } = useTransferFromSafeMutation()

const initialTransferDataValue = (): TransferModel => {
  const firstToken = tokens.value[0]
  return {
    address: { name: '', address: '' },
    token: firstToken ?? {
      symbol: '',
      balance: 0,
      tokenId: 'native',
      price: 0,
      name: '',
      code: ''
    },
    amount: '0'
  }
}

const transferData: Ref<TransferModel> = ref(initialTransferDataValue())

const retryOverview = () => {
  void refetchBalance()
  void refetchSafeInfo()
}

const openInSafeApp = () => openSafeAppUrl(getSafeHomeUrl(chainId.value, props.address))

const openDepositModal = () => {
  if (isWriteDisabled.value) return
  depositModal.value = { mount: true, show: true }
}

const openTransferModal = () => {
  if (!isConnectedUserOwner.value) return
  transferModal.value = { mount: true, show: true }
}

const resetTransferValues = () => {
  transferModal.value = { mount: false, show: false }
  transferData.value = initialTransferDataValue()
}

const handleTransfer = (model: TransferModel) => {
  transferFromSafe(
    {
      pathParams: { safeAddress: props.address },
      body: {
        options: {
          to: model.address.address,
          amount: model.amount,
          tokenId: model.token.tokenId
        }
      }
    },
    {
      onSuccess: () => {
        toast.add({
          title: 'Transfer proposed',
          description: 'The proposal is now waiting for the required signer approvals.',
          color: 'success'
        })
        resetTransferValues()
        reset()
      },
      onError: (error) => {
        const message = error.message.includes('User rejected')
          ? 'Transaction approval rejected'
          : error.message
        toast.add({ title: 'Transfer proposal failed', description: message, color: 'error' })
      }
    }
  )
}

const closeDepositModal = () => void (depositModal.value = { mount: false, show: false })

const handleDepositModalOpen = (open: boolean) => {
  if (!open) closeDepositModal()
}

const handleTransferModalOpen = (open: boolean) => {
  if (!open) resetTransferValues()
}
</script>
