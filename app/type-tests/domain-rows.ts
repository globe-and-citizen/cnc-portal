/** Compiler canaries: included by the normal app type-check, never imported by the app. */
import type { ExpenseApproval, ExpenseResponse, BudgetLimit } from '@/types/expense-account'
import type { TableRow } from '@/types/table'
import type { TeamContractReadModel } from '@/composables/contracts/readTeamContracts'
import type { ManagedContractRow } from '@/components/sections/ContractManagementView/MainContractTable.types'
import type { getTokens } from '@/utils/expenses/model'
import type { useContractOwnershipTransfer } from '@/composables/contracts/useContractOwnershipTransfer'
import type TransferAction from '@/components/sections/ExpenseAccountView/TransferAction.vue'
import type MainContractActions from '@/components/sections/ContractManagementView/MainContractActions.vue'

type Assert<T extends true> = T
type Fits<Value, Target> = [Value] extends [Target] ? true : false
type SpendingRow = Parameters<typeof getTokens>[0][number]
type ExpenseActionRow = InstanceType<typeof TransferAction>['$props']['row']
type OwnershipTarget = NonNullable<Parameters<typeof useContractOwnershipTransfer>[0]['value']>
type ContractActionRow = NonNullable<InstanceType<typeof MainContractActions>['$props']['row']>

export type ResponseFitsSpending = Assert<Fits<ExpenseResponse, SpendingRow>>
export type ApprovalFitsAction = Assert<Fits<ExpenseApproval, ExpenseActionRow>>
export type MissingBalanceStillFits = Assert<
  Fits<Pick<ExpenseApproval, 'signature' | 'data'>, SpendingRow>
>
export type ModelFitsTable = Assert<Fits<TeamContractReadModel, ManagedContractRow>>
export type ModelFitsAction = Assert<Fits<TeamContractReadModel, ContractActionRow>>
export type MinimalOwnershipFits = Assert<
  Fits<Pick<TeamContractReadModel, 'address' | 'abi' | 'type'>, OwnershipTarget>
>
export type NullSelectionFits = Assert<
  Fits<null, Parameters<typeof useContractOwnershipTransfer>[0]['value']>
>
export type ManagedKeysAreExplicit = Assert<string extends keyof ManagedContractRow ? false : true>

type NoSig = Omit<ExpenseApproval, 'signature'>
type NoData = Omit<ExpenseApproval, 'data'>
type NoToken = { signature: string; data: Omit<BudgetLimit, 'tokenAddress'> }
type NoAddr = Omit<TeamContractReadModel, 'address'>
type NoAbi = Omit<TeamContractReadModel, 'abi'>
type NoKind = Omit<TeamContractReadModel, 'type'>
type TargetNoAddr = Omit<OwnershipTarget, 'address'>
type TargetNoAbi = Omit<OwnershipTarget, 'abi'>
type TargetNoKind = Omit<OwnershipTarget, 'type'>

// @ts-expect-error Spending requires a signature.
export type SpendNoSig = Assert<Fits<NoSig, SpendingRow>>
// @ts-expect-error Spending requires budget data.
export type SpendNoData = Assert<Fits<NoData, SpendingRow>>
// @ts-expect-error Spending requires the approved token.
export type SpendNoToken = Assert<Fits<NoToken, SpendingRow>>
// @ts-expect-error Expense props require a signature.
export type ActionNoSig = Assert<Fits<NoSig, ExpenseActionRow>>
// @ts-expect-error Expense props require budget data.
export type ActionNoData = Assert<Fits<NoData, ExpenseActionRow>>
// @ts-expect-error A generic dictionary is not a spending approval.
export type DictNotExpense = Assert<Fits<TableRow, SpendingRow>>
// @ts-expect-error Managed rows require an address.
export type ManagedNoAddr = Assert<Fits<NoAddr, ManagedContractRow>>
// @ts-expect-error Managed rows require an ABI.
export type ManagedNoAbi = Assert<Fits<NoAbi, ManagedContractRow>>
// @ts-expect-error Managed rows require the contract kind.
export type ManagedNoKind = Assert<Fits<NoKind, ManagedContractRow>>
// @ts-expect-error The ownership target requires an address.
export type TargetNoAddress = Assert<Fits<TargetNoAddr, OwnershipTarget>>
// @ts-expect-error The ownership target requires an ABI.
export type TargetWithoutAbi = Assert<Fits<TargetNoAbi, OwnershipTarget>>
// @ts-expect-error The ownership target requires its kind.
export type TargetWithoutKind = Assert<Fits<TargetNoKind, OwnershipTarget>>
// @ts-expect-error A dictionary cannot guarantee ownership target fields.
export type DictNotOwner = Assert<Fits<TableRow, OwnershipTarget>>
// @ts-expect-error An approval is not an ownership target.
export type ExpenseNotOwner = Assert<Fits<ExpenseApproval, OwnershipTarget>>
// @ts-expect-error A managed contract is not an Expense approval.
export type ContractNotExpense = Assert<Fits<ManagedContractRow, ExpenseActionRow>>
// @ts-expect-error Contract action props require an ABI.
export type ContractActionNoAbi = Assert<Fits<NoAbi, ContractActionRow>>
