import { computed, ref, watch } from 'vue'
import { useToast } from '@nuxt/ui/composables'
import { type Address, formatUnits, isAddress, parseUnits } from 'viem'
import { z } from 'zod'
import { useTeamStore, useUserDataStore } from '@/stores'
import {
  useVestingAddress,
  useVestingGetTeamVestingsWithMembers
} from '@/composables/vesting/reads'
import { useVestingAddVestingWrite } from '@/composables/vesting/writes'
import { useVestingDateRange } from '@/composables/vesting/useVestingDateRange'
import { useContractBalance } from '@/composables/useContractBalance'
import { useErc20Allowance, useErc20BalanceOf } from '@/composables/erc20/reads'
import { useERC20Approve } from '@/composables/erc20/writes'
import { type VestingCreation } from '@/types/vesting'
import type { User } from '@/types'

const VESTING_TOKEN_DECIMALS = 6

interface CreateVestingProps {
  tokenAddress: string
  reloadKey: number
}

type CreateVestingEmit = (event: 'reload' | 'closeAddVestingModal') => void

// ⚠️ KNOWN ANTI-PATTERN — do not copy this shape.
//
// This is a "god composable": it bundles form state, validation, several
// reads (balance/allowance/team vestings) AND two on-chain writes
// (ERC20 approve + addVesting) plus the approve→submit orchestration, and
// returns ~20 bindings. It violates our single-purpose rule for composables.
//
// It is intentionally left as-is for now because the vesting contract is
// about to change: once vesting is integrated into the Officer contract the
// ERC20 approve + allowance step disappears entirely, which removes the
// bulk of this orchestration. Refactor THEN — split into a pure
// `vestingSchema` util, keep `useVestingDateRange`, and move the (much
// smaller) on-chain flow into a focused `useVestingCreation(payload)` — so
// we don't invest in decomposing logic we're about to delete.
export function useCreateVesting(props: CreateVestingProps, emit: CreateVestingEmit) {
  const toast = useToast()

  const userDataStore = useUserDataStore()
  const { balances } = useContractBalance(userDataStore.address as Address)
  const teamStore = useTeamStore()

  const {
    dateRange,
    calendarRange,
    isDatePickerOpen,
    duration,
    durationInDays,
    dateRangeLabel,
    onDateRangeChange
  } = useVestingDateRange()

  const member = ref({ name: '', address: '' })
  const cliff = ref(0)
  const totalAmount = ref(0)
  const showSummary = ref(false)
  const errorMessage = ref('')

  const vestingData = computed<VestingCreation>(() => ({
    member: member.value,
    startDate: dateRange.value?.[0] || new Date(),
    duration: duration.value,
    durationInDays: durationInDays.value,
    cliff: cliff.value,
    totalAmount: totalAmount.value
  }))

  const tokenBalance = computed(() =>
    balances.value.find((b) => b.token.address?.toLowerCase() === props.tokenAddress.toLowerCase())
  )

  const vestingTokenAddress = computed(() => props.tokenAddress as Address)
  const connectedUserAddress = computed(() => userDataStore.address as Address)
  const vestingAddressResult = useVestingAddress()
  const vestingAddress = computed(() => vestingAddressResult.value as Address)

  const { data: connectedUserVestingBalanceRaw, error: connectedUserVestingBalanceError } =
    useErc20BalanceOf(vestingTokenAddress, connectedUserAddress)

  watch(connectedUserVestingBalanceError, () => {
    if (connectedUserVestingBalanceError.value) {
      toast.add({ title: 'Error fetching connected user token balance', color: 'error' })
      console.error('connected user balance error', connectedUserVestingBalanceError.value)
    }
  })

  const connectedUserTokenBalance = computed<number | undefined>(() => {
    if (typeof connectedUserVestingBalanceRaw.value === 'bigint') {
      return Number(formatUnits(connectedUserVestingBalanceRaw.value, VESTING_TOKEN_DECIMALS))
    }
    return tokenBalance.value?.amount
  })

  const connectedUserTokenBalanceUnits = computed<bigint | undefined>(() => {
    if (typeof connectedUserVestingBalanceRaw.value === 'bigint') {
      return connectedUserVestingBalanceRaw.value
    }
    if (typeof tokenBalance.value?.amount === 'number') {
      return parseUnits(tokenBalance.value.amount.toString(), VESTING_TOKEN_DECIMALS)
    }
    return undefined
  })

  const {
    data: vestingInfos,
    error: errorGetVestingInfo,
    refetch: getVestingInfos
  } = useVestingGetTeamVestingsWithMembers(computed(() => BigInt(teamStore.currentTeamId ?? 0)))

  watch(errorGetVestingInfo, () => {
    if (errorGetVestingInfo.value) {
      toast.add({ title: 'Add admin failed', color: 'error' })
    }
  })

  const activeMembers = computed<string[]>(() => {
    if (!Array.isArray(vestingInfos.value) || vestingInfos.value.length !== 2) {
      return []
    }

    const [members] = vestingInfos.value
    return Array.isArray(members)
      ? members.filter((entry): entry is string => typeof entry === 'string')
      : []
  })

  const formState = computed(() => ({
    member: member.value,
    dateRange: dateRange.value,
    cliff: cliff.value,
    totalAmount: totalAmount.value
  }))

  const schema = computed(() => {
    const connectedUserBalance = connectedUserTokenBalance.value

    return z.object({
      member: z.object({
        address: z
          .string()
          .refine((v) => isAddress(v), { message: 'Please enter a valid Ethereum address.' })
      }),
      dateRange: z
        .array(z.instanceof(Date))
        .nullable()
        .refine((v) => v !== null && v.length === 2, { message: 'Date range is required.' }),
      cliff: z
        .number()
        .min(0)
        .refine((v) => v <= durationInDays.value, {
          message: 'Cliff cannot be greater than duration.'
        }),
      totalAmount: z
        .number()
        .refine((v) => v >= 1, { message: 'Amount must be greater than 0.' })
        .refine(
          (v) =>
            typeof connectedUserBalance !== 'number' ||
            Number.isNaN(connectedUserBalance) ||
            v <= connectedUserBalance,
          {
            message: `Insufficient Investor token balance`
          }
        )
    })
  })

  const handleSelectMember = (selectedMember: User) => {
    member.value = {
      name: selectedMember.name ?? '',
      address: selectedMember.address ?? ''
    }
  }

  watch(
    () => props.reloadKey,
    async () => {
      await getVestingInfos()
    }
  )

  const addVestingWrite = useVestingAddVestingWrite()
  const approveTokenWrite = useERC20Approve(vestingTokenAddress)

  const loading = computed(
    () => approveTokenWrite.isPending.value || addVestingWrite.isPending.value
  )

  const {
    data: allowance,
    refetch: getAllowance,
    error: allowanceError
  } = useErc20Allowance(vestingTokenAddress, connectedUserAddress, vestingAddress)

  watch(allowanceError, () => {
    if (allowanceError.value) {
      toast.add({ title: 'error on get Allowance', color: 'error' })
      console.error('allowance error ', allowanceError.value)
    }
  })

  const approvalAmountUnits = ref<bigint>(0n)

  function checkDuplicateVesting() {
    if (
      member.value.address &&
      activeMembers.value.some((m) => m.toLowerCase() === member.value.address.toLowerCase())
    ) {
      errorMessage.value = 'The member address already has an active vesting.'
      return true
    }
    return false
  }

  async function approveAllowance() {
    errorMessage.value = ''
    if (!checkDuplicateVesting()) {
      const vestingSpender = vestingAddressResult.value
      if (!vestingSpender || !isAddress(vestingSpender)) {
        errorMessage.value = 'Invalid vesting contract address'
        return
      }

      if (totalAmount.value > 0) {
        approvalAmountUnits.value = parseUnits(totalAmount.value.toString(), VESTING_TOKEN_DECIMALS)
        approveTokenWrite.mutate(
          { args: [vestingSpender, approvalAmountUnits.value] },
          {
            onSuccess: () => {
              toast.add({ title: 'Approval added successfully', color: 'success' })
              submit()
            },
            onError: (err) => {
              errorMessage.value = 'Approval failed'
              console.error('Approval error ', err)
            }
          }
        )
      } else {
        errorMessage.value = 'total amount value should be greater than zero'
      }
    }
  }

  function handleDisplaySummary() {
    errorMessage.value = ''
    const result = schema.value.safeParse(formState.value)
    if (result.success) showSummary.value = true
  }

  async function submit() {
    if (checkDuplicateVesting()) return
    const startDate = dateRange.value?.[0] || new Date()
    const start = Math.floor(startDate.getTime() / 1000)
    const durationInSeconds = durationInDays.value * 24 * 60 * 60
    const cliffInSeconds = cliff.value * 24 * 60 * 60
    const totalAmountInUnits = parseUnits(totalAmount.value.toString(), VESTING_TOKEN_DECIMALS)

    const balanceInUnits = connectedUserTokenBalanceUnits.value
    if (balanceInUnits !== undefined && balanceInUnits < totalAmountInUnits) {
      errorMessage.value = 'Insufficient token balance'
      return
    }

    await getAllowance()
    if (typeof allowance.value === 'bigint' && allowance.value < totalAmountInUnits) {
      errorMessage.value = 'Allowance is less than the total amount'
      return
    }
    addVestingWrite.mutate(
      {
        args: [
          BigInt(teamStore.currentTeamId ?? 0),
          member.value.address as Address,
          BigInt(start),
          BigInt(durationInSeconds),
          BigInt(cliffInSeconds),
          totalAmountInUnits,
          props.tokenAddress as Address
        ]
      },
      {
        onSuccess: () => {
          toast.add({ title: 'vesting added successfully', color: 'success' })
          cliff.value = 0
          totalAmount.value = 0
          dateRange.value = null
          calendarRange.value = null
          member.value = { name: '', address: '' }
          duration.value = { years: 0, months: 0, days: 0 }
          showSummary.value = false
          errorMessage.value = ''
          emit('closeAddVestingModal')
          emit('reload')
        },
        onError: (err) => {
          errorMessage.value = 'Add vesting failed'
          console.error('add vesting error', err)
        }
      }
    )
  }

  return {
    member,
    cliff,
    totalAmount,
    calendarRange,
    isDatePickerOpen,
    showSummary,
    errorMessage,
    vestingData,
    tokenBalance,
    activeMembers,
    formState,
    schema,
    dateRangeLabel,
    loading,
    handleSelectMember,
    onDateRangeChange,
    handleDisplaySummary,
    approveAllowance,
    submit
  }
}
