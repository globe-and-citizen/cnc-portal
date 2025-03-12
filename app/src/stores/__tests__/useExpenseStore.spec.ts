import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useExpenseStore } from '@/stores/useExpenseStore'

type ExpenseStore = ReturnType<typeof useExpenseStore>

describe('useExpenseStore', () => {
  let expenseStore: ExpenseStore

  beforeEach(() => {
    setActivePinia(createPinia())
    expenseStore = useExpenseStore()
  })

  it('initializes with false reload', () => {
    expect(expenseStore.reload).toBeFalsy()
  })

  it('sets the reload status to true', () => {
    expenseStore.setReload(true)
    expect(expenseStore.reload).toBeTruthy()
  })

  it('sets the reload state to true', () => {
    expenseStore.setReload(false)
    expect(expenseStore.reload).toBeFalsy()
  })
})
