<template>
  <div>
    <TeamArchivedTooltip v-slot="{ disabled: archivedDisabled }">
      <UButton
        color="success"
        :disabled="row.status !== 'enabled' || archivedDisabled"
        @click="showModal = { mount: true, show: true }"
        data-test="transfer-button"
      >
        Spend
      </UButton>
    </TeamArchivedTooltip>

    <UModal
      v-if="showModal.mount"
      v-model:open="showModal.show"
      data-test="transfer-modal"
      title="Transfer from Expenses Contract"
      :description="
        expenseBalance
          ? `Spendable balance: ${tokens[0]?.spendableBalance ?? tokens[0]?.balance ?? 0} ${transferData.token.symbol}`
          : undefined
      "
      :close="{
        onClick: () => {
          showModal = { mount: false, show: false }
          errorMessage = ''
        }
      }"
    >
      <template #body>
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          :description="errorMessage"
          class="mb-4"
        />
        <TransferForm
          v-if="showModal.mount && tokens.length > 0"
          v-model="transferData"
          :tokens="tokens"
          :loading="transferMutation.isPending.value || approveMutation.isPending.value"
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
import { USDC_ADDRESS, type TokenId } from '@/constant'
import type { BudgetLimit } from '@/types'
import { useContractBalance } from '@/composables'
import { useTeamStore, useUserDataStore } from '@/stores'
import { getTokens, log, parseError } from '@/utils'
import { encodeFunctionData, parseEther, zeroAddress, type Address } from 'viem'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { estimateGas, readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { ERC20_ABI } from '@/artifacts/abi/erc20'
import { useERC20Approve } from '@/composables/erc20/writes'
import { useExpenseAccountTransfer } from '@/composables/expenseAccount/writes'
import { expenseKeys } from '@/queries'
import { useQueryClient } from '@tanstack/vue-query'
import type { TableRow } from '@/types/table'
import type { TransferData } from '@/types'
const props = defineProps<{ row: TableRow }>()

const teamStore = useTeamStore()
const userDataStore = useUserDataStore()
const toast = useToast()
const { balances } = useContractBalance(
  ref(teamStore.getContractAddressByType('ExpenseAccountEIP712'))
)
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
const expenseBalance = computed(() => {
  const maxAmountData = props.row.data.amount
  const amountTransferred = props.row.balances[1]
  return maxAmountData && amountTransferred
    ? Number(maxAmountData) - Number(amountTransferred)
    : null
})

const expenseAccountEip712Address = computed(() =>
  teamStore.getContractAddressByType('ExpenseAccountEIP712')
)

const tokens = computed(() => getTokens([props.row], props.row.signature, balances.value))

const transferMutation = useExpenseAccountTransfer()
const approveMutation = useERC20Approve(computed(() => USDC_ADDRESS as Address))

const transferFromExpenseAccount = async (to: string, amount: string) => {
  errorMessage.value = ''
  const budgetLimit = props.row.data
  if (!expenseAccountEip712Address.value || !props.row) return

  if (budgetLimit.tokenAddress === zeroAddress) {
    await transferNativeToken(to, amount, budgetLimit)
  } else {
    await transferErc20Token(to, amount, budgetLimit)
  }
}

const submitExpenseAccountTransfer = (args: readonly unknown[]) => {
  transferMutation.mutate(
    { args },
    {
      onSuccess: () => {
        toast.add({ title: 'Transfer Successful', color: 'success' })
        showModal.value = { mount: false, show: false }
        queryClient.invalidateQueries({ queryKey: expenseKeys.list(teamStore.currentTeamId) })
      },
      onError: (err) => {
        log.error(parseError(err, EXPENSE_ACCOUNT_EIP712_ABI))
        errorMessage.value = 'Failed to transfer'
      }
    }
  )
}

const transferNativeToken = async (to: string, amount: string, budgetLimit: BudgetLimit) => {
  if (!expenseAccountEip712Address.value || !amount || !to) return
  const args = [
    to,
    parseEther(amount),
    {
      ...budgetLimit,
      amount:
        budgetLimit.tokenAddress === zeroAddress
          ? parseEther(`${budgetLimit.amount}`)
          : BigInt(Number(budgetLimit.amount) * 1e6),
      frequencyType: Number(budgetLimit.frequencyType),
      customFrequency: BigInt(Number(budgetLimit.customFrequency)),
      startDate: Number(budgetLimit.startDate),
      endDate: Number(budgetLimit.endDate)
    },
    props.row.signature
  ] as const

  try {
    const data = encodeFunctionData({
      abi: EXPENSE_ACCOUNT_EIP712_ABI,
      functionName: 'transfer',
      args
    })
    await estimateGas(config, { to: expenseAccountEip712Address.value, data })
  } catch (error) {
    log.error('Error in transferNativeToken:', parseError(error, EXPENSE_ACCOUNT_EIP712_ABI))
    errorMessage.value = parseError(error, EXPENSE_ACCOUNT_EIP712_ABI)
    return
  }

  submitExpenseAccountTransfer(args)
}

const transferErc20Token = async (to: string, amount: string, budgetLimit: BudgetLimit) => {
  if (!expenseAccountEip712Address.value) return

  const _amount = BigInt(Number(amount) * 1e6)
  const tokenAddress = USDC_ADDRESS as Address

  let allowance: bigint
  try {
    allowance = (await readContract(config, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userDataStore.address as Address, expenseAccountEip712Address.value]
    })) as bigint
  } catch (error) {
    log.error('Error reading allowance:', parseError(error))
    errorMessage.value = 'Failed to read allowance'
    return
  }

  const buildArgs = () =>
    [
      to,
      _amount,
      {
        ...budgetLimit,
        amount: BigInt(Number(budgetLimit.amount) * 1e6),
        frequencyType: Number(budgetLimit.frequencyType),
        customFrequency: BigInt(Number(budgetLimit.customFrequency)),
        startDate: Number(budgetLimit.startDate),
        endDate: Number(budgetLimit.endDate)
      },
      props.row.signature
    ] as const

  if (allowance < _amount) {
    approveMutation.mutate(
      { args: [expenseAccountEip712Address.value, _amount] },
      {
        onSuccess: () => {
          toast.add({ title: 'Approval granted successfully', color: 'success' })
          submitExpenseAccountTransfer(buildArgs())
        },
        onError: (err) => {
          log.error(parseError(err))
          errorMessage.value = 'Failed to approve token spending'
        }
      }
    )
    return
  }

  submitExpenseAccountTransfer(buildArgs())
}
</script>
