import { vi } from 'vitest'
import {
  mockCashRemunerationReads,
  mockCashRemunerationWrites,
  mockExpenseAccountReads,
  mockExpenseAccountWrites
} from '../mocks/contract.mock'

vi.mock('@/composables/cashRemuneration/reads', () => ({
  useCashRemunerationOwner: vi.fn(() => mockCashRemunerationReads.owner)
}))

vi.mock('@/composables/expenseAccount/reads', () => ({
  useExpenseAccountOwner: vi.fn(() => mockExpenseAccountReads.owner)
}))

vi.mock('@/composables/cashRemuneration/writes', () => ({
  useOwnerWithdrawAllToBank: vi.fn(() => mockCashRemunerationWrites.ownerWithdrawAllToBank)
}))

vi.mock('@/composables/expenseAccount/writes', () => ({
  useOwnerWithdrawAllToBank: vi.fn(() => mockExpenseAccountWrites.ownerWithdrawAllToBank)
}))
