<template>
  <div class="stats bg-green-100 flex text-primary-content border-outline">
    <div class="stat flex flex-col justify-center items-center">
      <div class="stat-title">Team balance</div>
      <span v-if="team.bankAddress" class="flex gap-2 items-center">
        <ToolTip data-test="bank-address-tooltip" content="Click to see address in block explorer">
          <span
            class="badge badge-sm cursor-pointer"
            data-test="team-bank-address"
            @click="openExplorer(team.bankAddress)"
            :class="`${team.ownerAddress == useUserDataStore().address ? 'badge-primary' : 'badge-secondary'}`"
            >{{ team.bankAddress }}</span
          >
        </ToolTip>
        <ToolTip
          data-test="copy-address-tooltip"
          :content="copied ? 'Copied!' : 'Click to copy address'"
        >
          <ClipboardDocumentListIcon
            v-if="isSupported && !copied"
            class="size-5 cursor-pointer"
            @click="copy(team.bankAddress)"
          />
          <ClipboardDocumentCheckIcon v-if="copied" class="size-5" />
        </ToolTip>
      </span>
      <span
        class="loading loading-dots loading-xs"
        data-test="balance-loading"
        v-if="balanceLoading"
      ></span>
      <div class="stat-value text-3xl mt-2" v-else>
        {{ teamBalance }} <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
      </div>
      <div class="stat-actions flex justify-center gap-2 items-center">
        <button
          class="btn btn-xs btn-secondary"
          v-if="team.bankAddress"
          @click="() => (depositModal = true)"
        >
          Deposit
        </button>
        <button
          class="btn btn-xs btn-secondary"
          v-if="team.bankAddress && team.ownerAddress == useUserDataStore().address"
          @click="transferModal = true"
        >
          Transfer
        </button>
      </div>
    </div>
    <div class="stat flex flex-col justify-center items-center">
      <div class="stat-title">Send to Members</div>
      <div class="stat-value text-sm mt-2">
        <input
          type="text"
          size="5"
          class="h-10 outline-neutral-content rounded-md border-neutral-content text-center"
          placeholder="Tip"
          v-model="tipAmount"
        />
        <span class="text-xs ml-2">{{ NETWORK.currencySymbol }}</span>
      </div>
      <div class="stat-actions justify-center flex">
        <LoadingButton v-if="pushTipLoading" color="primary btn-xs" />
        <button
          v-else
          className="btn btn-primary btn-xs text-white "
          @click="
            () => {
              if (team.bankAddress) pushTip(membersAddress, tipAmount, team.bankAddress)
            }
          "
        >
          Send
        </button>
      </div>
    </div>
    <ModalComponent v-model="depositModal">
      <DepositBankForm
        v-if="depositModal"
        @close-modal="() => (depositModal = false)"
        @deposit="async (amount: string) => depositToBank(amount)"
        :loading="depositLoading"
      />
    </ModalComponent>
    <ModalComponent v-model="transferModal">
      <TransferFromBankForm
        v-if="transferModal"
        @close-modal="() => (transferModal = false)"
        @transfer="
          async (to: string, amount: string) => {
            transferFromBank(to, amount)
          }
        "
        @searchMembers="(input) => searchUsers({ name: '', address: input })"
        :filteredMembers="foundUsers"
        :loading="transferLoading"
        :bank-balance="teamBalance"
      />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import type { Team, User } from '@/types'
import { NETWORK } from '@/constant'
import { onMounted, ref, watch, computed } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { useUserDataStore } from '@/stores/user'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'

import { useToastStore } from '@/stores/useToastStore'
import { usePushTip } from '@/composables/tips'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import { useClipboard } from '@vueuse/core'
import ToolTip from '@/components/ToolTip.vue'
import { useBankBalance, useBankDeposit, useBankTransfer } from '@/composables/bank'
import { useCustomFetch } from '@/composables/useCustomFetch'

const tipAmount = ref(0)
const transferModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')

const { copy, copied, isSupported } = useClipboard()

const { addSuccessToast, addErrorToast } = useToastStore()

const depositModal = ref(false)

const {
  execute: deposit,
  isLoading: depositLoading,
  isSuccess: depositSuccess,
  error: depositError
} = useBankDeposit()

const {
  execute: getBalance,
  isLoading: balanceLoading,
  data: teamBalance,
  error: balanceError
} = useBankBalance()
const {
  execute: transfer,
  isLoading: transferLoading,
  isSuccess: transferSuccess,
  error: transferError
} = useBankTransfer()
const {
  execute: pushTip,
  isLoading: pushTipLoading,
  isSuccess: pushTipSuccess,
  error: pushTipError
} = usePushTip()
const {
  execute: executeSearchUser,
  response: searchUserResponse,
  data: users
} = useCustomFetch('user/search', {
  immediate: false,
  beforeFetch: async ({ options, url, cancel }) => {
    const params = new URLSearchParams()
    if (!searchUserName.value && !searchUserAddress.value) return
    if (searchUserName.value) params.append('name', searchUserName.value)
    if (searchUserAddress.value) params.append('address', searchUserAddress.value)
    url += '?' + params.toString()
    return { options, url, cancel }
  }
})
  .get()
  .json()

const props = defineProps<{
  team: Partial<Team>
}>()

watch(depositSuccess, () => {
  if (depositSuccess.value) {
    addSuccessToast('Deposited successfully')
  }
})
watch(depositError, () => {
  if (depositError.value) {
    addErrorToast('Failed to deposit')
  }
})
watch(balanceError, () => {
  if (balanceError.value) {
    addErrorToast('Failed to fetch team balance')
  }
})
watch(pushTipError, async () => {
  if (pushTipError.value) {
    addErrorToast('Failed to push tip')
  }
})

watch(pushTipSuccess, () => {
  if (pushTipSuccess.value) {
    addSuccessToast('Tips pushed successfully')
  }
})
watch(transferSuccess, () => {
  if (transferSuccess.value) {
    addSuccessToast('Transferred successfully')
  }
})
watch(transferError, () => {
  if (transferError.value) {
    addErrorToast('Failed to transfer')
  }
})
watch(searchUserResponse, () => {
  if (searchUserResponse.value?.ok && users.value?.users) {
    foundUsers.value = users.value.users
  }
})

const openExplorer = (address: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/address/${address}`, '_blank')
}
const depositToBank = async (amount: string) => {
  if (props.team.bankAddress) {
    await deposit(props.team.bankAddress, amount)
    if (depositSuccess.value) {
      depositModal.value = false
      await getBalance(props.team.bankAddress)
    }
  }
}
const transferFromBank = async (to: string, amount: string) => {
  if (!props.team.bankAddress) return
  await transfer(props.team.bankAddress, to, amount)
  if (transferSuccess.value) {
    transferModal.value = false
    await getBalance(props.team.bankAddress)
  }
}
const searchUsers = async (input: { name: string; address: string }) => {
  try {
    searchUserName.value = input.name
    searchUserAddress.value = input.address
    if (searchUserName.value || searchUserAddress.value) {
      await executeSearchUser()
    }
  } catch (error) {
    addErrorToast('Failed to search users')
  }
}

onMounted(() => {
  if (props.team.bankAddress) getBalance(props.team.bankAddress)
})
const membersAddress = computed(() => {
  return props.team.members?.map((member: { address: string }) => member.address) ?? []
})
</script>
