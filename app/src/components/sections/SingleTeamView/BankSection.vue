<template>
  <div class="flex flex-col gap-y-4 py-6">
    <span class="text-3xl font-bold">Team Bank Account</span>

    <div class="divider m-0"></div>
    <div>
      <div class="flex justify-between">
        <div>
          <span>Bank Balance</span>
          <div class="font-extrabold text-4xl">
            <span class="inline-block w-16 h-10">
              <span class="loading loading-spinner loading-lg" v-if="balanceLoading"></span>
              <span v-else>{{ teamBalance }} </span></span
            >
            <span class="text-xs">{{ NETWORK.currencySymbol }}</span>
          </div>
          <span>≈ $ 1.28</span>
        </div>
        <div class="flex gap-4">
          <Button variant="secondary" v-if="team.bankAddress" @click="() => (depositModal = true)">
            Deposit
          </Button>
          <Button variant="secondary" v-if="team.bankAddress" @click="() => (pushTipModal = true)">
            Tips the Team
          </Button>
          <Button
            variant="secondary"
            v-if="team.bankAddress && (team.ownerAddress == useUserDataStore().address || isBod)"
            @click="transferModal = true"
          >
            Transfer
          </Button>
        </div>
      </div>
      <div class="flex gap-4 justify-end" data-test="team-bank-address">
        <span>Bank Address </span><AddressToolTip :address="team.bankAddress ?? ''" />
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
          async (to: string, amount: string, description: string) => {
            if (owner == team.boardOfDirectorsAddress) {
              await addTransferAction(to, amount, description)
            } else {
              await transferFromBank(to, amount)
            }
          }
        "
        @searchMembers="(input) => searchUsers({ name: '', address: input })"
        :filteredMembers="foundUsers"
        :loading="transferLoading || addActionLoading"
        :bank-balance="teamBalance || '0'"
        service="Bank"
        :asBod="owner == team.boardOfDirectorsAddress"
      />
    </ModalComponent>
    <ModalComponent v-model="pushTipModal">
      <div class="flex flex-col gap-4 justify-start">
        <span class="font-bold text-2xl">Tips The Team</span>
        <span>
          This Send tips to all team Members {{ tipAmount }} {{ NETWORK.currencySymbol }}
        </span>

        <input
          type="text"
          size="5"
          class="input input-bordered w-full"
          placeholder="Tip"
          v-model="tipAmount"
        />

        <div class="text-center">
          <LoadingButton v-if="false" class="w-44" color="primary" />
          <!-- TODO send tips to all team members -->
          <button
            v-if="!false"
            class="btn btn-primary w-44 text-center"
            @click="
              () => {
                addPushTipAction('Pushed tips to all team members')
              }
            "
          >
            Send Tips
          </button>
        </div>
      </div>
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import type { Team, User } from '@/types'
import { NETWORK } from '@/constant'
import { onMounted, ref, watch, computed } from 'vue'
import LoadingButton from '@/components/LoadingButton.vue'
import { useUserDataStore } from '@/stores/user'
import ModalComponent from '@/components/ModalComponent.vue'
import DepositBankForm from '@/components/forms/DepositBankForm.vue'
import Button from '@/components/ButtonUI.vue'

import { useToastStore } from '@/stores/useToastStore'
import { usePushTip } from '@/composables/tips'
import TransferFromBankForm from '@/components/forms/TransferFromBankForm.vue'
import { useBankBalance, useBankDeposit, useBankOwner, useBankTransfer } from '@/composables/bank'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useAddAction, useGetBoardOfDirectors } from '@/composables/bod'
import { BankService } from '@/services/bankService'
import type { Address } from 'viem'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import AddressToolTip from '@/components/AddressToolTip.vue'

const tipAmount = ref(0)
const transferModal = ref(false)
const pushTipModal = ref(false)
const foundUsers = ref<User[]>([])
const searchUserName = ref('')
const searchUserAddress = ref('')
const ethers = EthersJsAdapter.getInstance()

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
  // execute: pushTip,
  // isLoading: pushTipLoading,
  isSuccess: pushTipSuccess,
  error: pushTipError
} = usePushTip()
const { boardOfDirectors, execute: executeGetBoardOfDirectors } = useGetBoardOfDirectors()
const isBod = computed(() => boardOfDirectors.value?.includes(useUserDataStore().address))
const {
  execute: executeAddAction,
  error: errorAddAction,
  isLoading: addActionLoading,
  isSuccess: addActionSuccess
} = useAddAction()
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
  team: Pick<Team, 'bankAddress' | 'boardOfDirectorsAddress' | 'ownerAddress' | "members">
}>()

const {
  data: owner,
  error: errorOwner,
  // isLoading: loadingOwner,
  execute: getOwner
} = useBankOwner(props.team.bankAddress!)

const bankService = new BankService()

const addTransferAction = async (to: string, amount: string, description: string) => {
  await executeAddAction(props.team, {
    targetAddress: props.team.bankAddress! as Address,
    data: (await bankService.getFunctionSignature(props.team.bankAddress!, 'transfer', [
      to,
      ethers.parseEther(amount)
    ])) as Address,
    description
  })
  if (errorAddAction.value) return
  transferModal.value = false
}
const addPushTipAction = async (description: string) => {
  await executeAddAction(props.team, {
    targetAddress: props.team.bankAddress! as Address,
    data: (await bankService.getFunctionSignature(props.team.bankAddress!, 'pushTip', [
      membersAddress.value,
      ethers.parseEther(tipAmount.value.toString())
    ])) as Address,
    description
  })
  if (errorAddAction.value) return

  pushTipModal.value = false
  tipAmount.value = 0
}

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
watch(errorOwner, () => {
  if (errorOwner.value) {
    addErrorToast('Failed to get bank owner')
  }
})
watch(errorAddAction, () => {
  if (errorAddAction.value) {
    addErrorToast('Failed to add action')
  }
})
watch(addActionSuccess, () => {
  if (addActionSuccess.value) {
    addSuccessToast('Action added successfully')
  }
})

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

onMounted(async () => {
  if (props.team.bankAddress) getBalance(props.team.bankAddress)
  await getOwner()
  await executeGetBoardOfDirectors(props.team.boardOfDirectorsAddress!)
})
const membersAddress = computed(() => {
  return props.team.members?.map((member: { address: string }) => member.address) ?? []
})
</script>
