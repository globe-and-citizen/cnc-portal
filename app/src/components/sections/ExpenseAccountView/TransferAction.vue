<template>
  <div>
    <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
      <UButton
        color="success"
        :disabled="row.status !== 'enabled' || archivedDisabled || wrongNetwork"
        @click="showModal = { mount: true, show: true }"
        data-test="transfer-button"
      >
        Spend
      </UButton>
    </TeamArchivedTooltip>
    <span v-if="wrongNetwork" class="text-xs text-amber-600"
      >Switch to the approval network to spend</span
    >

    <UModal
      v-if="showModal.mount"
      v-model:open="showModal.show"
      data-test="transfer-modal"
      title="Transfer from Expenses Contract"
      :description="spendableBalanceLabel"
      :close="{
        onClick: () => {
          showModal = { mount: false, show: false }
          errorMessage = ''
        }
      }"
    >
      <template #body>
        <UAlert
          v-if="row.sourceGeneration === 'previous'"
          color="warning"
          variant="soft"
          title="Previous contract version"
          :description="
            row.sourceEnforcesDisabled === false
              ? 'This older contract may still accept spending after Disable. Its owner can move the remaining funds to retire this balance.'
              : 'This spend uses the older Expense Account and its own balance. The owner can retire its approvals and move its remaining funds.'
          "
          class="mb-4"
        />
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          :description="errorMessage"
          class="mb-4"
        />
        <div
          v-if="bodyState === 'loading'"
          class="flex items-center justify-center gap-2 py-6 text-sm text-gray-500"
          data-test="balance-loading"
        >
          <UIcon name="i-lucide-loader-circle" class="animate-spin" />
          <span>Loading contract balance…</span>
        </div>

        <UAlert
          v-else-if="bodyState === 'error'"
          color="error"
          variant="soft"
          description="Failed to read the Expenses Contract balance. Close this dialog and try again."
          data-test="balance-error"
        />

        <UAlert
          v-else-if="bodyState === 'unsupported'"
          color="warning"
          variant="soft"
          description="This expense is denominated in a token that is not supported."
          data-test="balance-unsupported"
        />

        <TransferForm
          v-else
          v-model="transferData"
          :tokens="tokens"
          :loading="transferMutation.isPending.value"
          @transfer="
            async (data) => {
              await transferFromExpenseAccount(data.address.address, data.amount)
            }
          "
          @vue:unmounted="
            () => {
              transferData = createDefaultTransferData()
            }
          "
          @closeModal="showModal = { mount: false, show: false }"
        >
          <template #label>
            <span class="text-sm font-medium">Transfer From</span>
            <span class="text-xs text-gray-500"
              >Limit: {{ row.data.amount }} {{ transferData.token.symbol }}
            </span>
          </template>
        </TransferForm>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TeamArchivedTooltip from '@/components/ui/TeamArchivedTooltip.vue'
import TransferForm from '@/components/forms/TransferForm.vue'
import { type TokenId } from '@/constant'
import type { BudgetLimit } from '@/types'
import { useContractBalance } from '@/composables'
import { useTeamStore } from '@/stores'
import { budgetLimitTypes, buildContractBudgetLimit, getTokens } from '@/utils/expenses/model'
import { productExpenseToken } from '@/utils/expenses/tokenPolicy'
import { classifyError } from '@/utils/errors/classifyContractError'
import { log } from '@/lib/logging'
import {
  encodeFunctionData,
  parseEther,
  parseUnits,
  recoverTypedDataAddress,
  isAddress,
  zeroAddress,
  type Address,
  type Hex
} from 'viem'
import { expenseAccountEip712Abi } from '@/artifacts/abi/generated'
import { estimateGas, readContract } from '@wagmi/core'
import { useChainId } from '@wagmi/vue'
import { config } from '@/wagmi.config'
import { useExpenseAccountTransfer } from '@/composables/expenseAccount/writes'
import type { WriteFunctionArgs } from '@/composables/contracts/useContractWritesV3'
import { expenseKeys } from '@/queries'
import { useQueryClient } from '@tanstack/vue-query'
import type { TableRow } from '@/types/table'
import type { TransferData } from '@/types'
const props = defineProps<{ row: TableRow }>()

const teamStore = useTeamStore()
const toast = useToast()
const chainId = useChainId()

const expenseAccountEip712Address = computed(() => {
  const source = props.row.data.signedAgainstContractAddress
  return typeof source === 'string' && isAddress(source) ? (source as Address) : undefined
})
const wrongNetwork = computed(
  () => typeof props.row.data.chainId === 'number' && props.row.data.chainId !== chainId.value
)

const {
  data: balance,
  isLoading: isBalanceLoading,
  error: balanceError
} = useContractBalance(expenseAccountEip712Address)
const balances = computed(() => balance.value?.balances ?? [])
const queryClient = useQueryClient()

const showModal = ref({ mount: false, show: false })
const errorMessage = ref('')

const createDefaultTransferData = (): TransferData => ({
  address: { name: '', address: '' },
  token: {
    symbol: '',
    balance: 0,
    tokenId: 'usdc' as TokenId,
    price: 0,
    code: 'USD',
    spendableBalance: 0
  },
  amount: '0'
})

const transferData = ref(createDefaultTransferData())

const tokens = computed(() => getTokens([props.row], props.row.signature, balances.value))
const spendableToken = computed(() => tokens.value[0])

/**
 * What the modal body shows. `getTokens` yields nothing until the contract
 * balance has been read, so an empty `tokens` is ambiguous on its own: the
 * balance may still be in flight, the read may have failed, or the expense may
 * be denominated in a token we do not support. Rendering the form only, with no
 * `v-else`, turned all three into a blank modal.
 */
const bodyState = computed(() => {
  if (spendableToken.value) return 'ready'
  if (!expenseAccountEip712Address.value || isBalanceLoading.value) return 'loading'
  if (balanceError.value) return 'error'
  return 'unsupported'
})

const spendableBalanceLabel = computed(() => {
  const token = spendableToken.value
  if (!token) return undefined
  return `Spendable balance: ${token.spendableBalance ?? token.balance} ${token.symbol}`
})

const transferMutation = useExpenseAccountTransfer(expenseAccountEip712Address)

const transferFromExpenseAccount = async (to: string, amount: string) => {
  errorMessage.value = ''
  const budgetLimit = props.row.data
  if (!expenseAccountEip712Address.value || !props.row) return

  if (!(await verifyApprovalSignature(budgetLimit))) return

  if (budgetLimit.tokenAddress === zeroAddress) {
    await transferNativeToken(to, amount, budgetLimit)
  } else {
    transferErc20Token(to, amount, budgetLimit)
  }
}

const verifyApprovalSignature = async (budgetLimit: BudgetLimit) => {
  const sourceContract = expenseAccountEip712Address.value
  if (!sourceContract || !budgetLimit.signedAgainstContractAddress || !budgetLimit.chainId) {
    errorMessage.value = 'Approval signing contract or network is unavailable'
    return false
  }

  if (budgetLimit.signedAgainstContractAddress.toLowerCase() !== sourceContract.toLowerCase()) {
    errorMessage.value = 'Signature issued for a different ExpenseAccount contract'
    return false
  }

  if (budgetLimit.chainId !== chainId.value) {
    errorMessage.value = 'Signature issued for a different network'
    return false
  }

  try {
    const owner = (await readContract(config, {
      address: sourceContract,
      abi: expenseAccountEip712Abi,
      functionName: 'owner'
    })) as Address

    const recovered = await recoverTypedDataAddress({
      domain: {
        name: 'CNCExpenseAccount',
        version: '1',
        chainId: chainId.value,
        verifyingContract: sourceContract
      },
      types: budgetLimitTypes,
      primaryType: 'BudgetLimit',
      message: buildContractBudgetLimit(budgetLimit),
      signature: props.row.signature as Hex
    })

    if (recovered.toLowerCase() !== owner.toLowerCase()) {
      errorMessage.value = 'Signature issued for a different ExpenseAccount contract'
      return false
    }
  } catch (error) {
    log.error('Error verifying expense approval signature:', error)
    errorMessage.value = 'Failed to verify expense approval signature'
    return false
  }

  return true
}

type ExpenseTransferArgs = WriteFunctionArgs<typeof expenseAccountEip712Abi, 'transfer'>

const submitExpenseAccountTransfer = (args: ExpenseTransferArgs) => {
  transferMutation.mutate(
    { args },
    {
      onSuccess: () => {
        toast.add({ title: 'Transfer Successful', color: 'success' })
        showModal.value = { mount: false, show: false }
        queryClient.invalidateQueries({ queryKey: expenseKeys.list(teamStore.currentTeamId) })
      },
      onError: (err) => {
        log.error('Expense account transfer failed:', err)
        const classified = classifyError(err, { contract: 'ExpenseAccount' })
        if (classified.category === 'user_rejected') return
        errorMessage.value = classified.userMessage
      }
    }
  )
}

const transferNativeToken = async (to: string, amount: string, budgetLimit: BudgetLimit) => {
  if (!expenseAccountEip712Address.value || !amount || !to) return
  const args = [
    to,
    parseEther(amount),
    buildContractBudgetLimit(budgetLimit),
    props.row.signature
  ] as const

  try {
    const data = encodeFunctionData({
      abi: expenseAccountEip712Abi,
      functionName: 'transfer',
      args
    })
    await estimateGas(config, { to: expenseAccountEip712Address.value, data })
  } catch (error) {
    log.error('Error in transferNativeToken:', error)
    errorMessage.value = classifyError(error, { contract: 'ExpenseAccount' }).userMessage
    return
  }

  submitExpenseAccountTransfer(args)
}

// `transfer` pays out of the expense contract's own token balance — it never
// calls `transferFrom` on the caller — so no ERC20 allowance is needed here.
const transferErc20Token = (to: string, amount: string, budgetLimit: BudgetLimit) => {
  if (!expenseAccountEip712Address.value) return
  const token = productExpenseToken(budgetLimit.tokenAddress)
  if (!token) {
    errorMessage.value = 'This token is not available for Expense Account spending'
    return
  }

  submitExpenseAccountTransfer([
    to,
    parseUnits(amount, token.decimals),
    buildContractBudgetLimit(budgetLimit),
    props.row.signature
  ] as const)
}
</script>
