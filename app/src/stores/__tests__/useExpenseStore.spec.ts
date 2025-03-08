import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    // toastStore.addInfoToast('Test Toast')
    expenseStore.setReload(true)
    expect(expenseStore.reload).toBeTruthy()
    // expect(toastStore.toasts.length).toBe(1)
    // expect(toastStore.toasts[0]).toMatchObject({ message: 'Test Toast', timeout: 5000, id: 1 })
  })

  it('sets the reload state to true', () => {
    expenseStore.setReload(false)
    expect(expenseStore.reload).toBeFalsy()
  })
})
