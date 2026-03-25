import { describe, it, expect } from 'vitest'
import * as safeModule from '../index'

describe('safe index exports', () => {
  it('exports key Safe composables', () => {
    expect(typeof safeModule.useSafeDeployment).toBe('function')
    expect(typeof safeModule.useSafeOwnerManagement).toBe('function')
    expect(typeof safeModule.useSafeExecution).toBe('function')
    expect(typeof safeModule.useSafeApproval).toBe('function')
    expect(typeof safeModule.useSafeProposal).toBe('function')
    expect(typeof safeModule.useSafeTransactionConflicts).toBe('function')
    expect(typeof safeModule.useSafeTransfer).toBe('function')
    expect(typeof safeModule.useSafeSDK).toBe('function')
  })

  it('exports Safe URL utilities', () => {
    expect(typeof safeModule.getSafeHomeUrl).toBe('function')
    expect(typeof safeModule.getSafeSettingsUrl).toBe('function')
    expect(typeof safeModule.openSafeAppUrl).toBe('function')
    expect(typeof safeModule.getInjectedProvider).toBe('function')
    expect(typeof safeModule.randomSaltNonce).toBe('function')
  })
})
